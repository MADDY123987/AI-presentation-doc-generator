# backend/routers/documents.py

from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from core.dbutils import get_db
from models import models, schemas, enums
from services.content_generator import (
    generate_word_sections_with_gemini,
    refine_word_section_with_gemini,
)
from services.docx_generator import build_docx_file

from .auth_bridge import get_current_user

router = APIRouter(tags=["Documents"])


@router.post("/", response_model=schemas.ProjectOut)
def create_word_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a new Word (.docx) project and generate initial content.
    """
    if project_in.doc_type != enums.DocumentType.DOCX:
        raise HTTPException(
            status_code=400,
            detail="doc_type must be 'docx' for this endpoint",
        )

    # ---- Create project row ----
    project = models.Project(
        owner_id=current_user.id,
        title=project_in.title,
        topic=project_in.topic,
        doc_type=project_in.doc_type,
        num_pages=project_in.num_pages,
    )
    db.add(project)
    db.flush()  # get project.id

    # 1️⃣ NEW PAGE-BASED MODE
    if project_in.pages and project_in.num_pages:
        flat_headings: List[str] = []
        for page_cfg in sorted(project_in.pages, key=lambda p: p.page_number):
            for title in page_cfg.sections:
                flat_headings.append(title)

        generated_sections = generate_word_sections_with_gemini(
            topic=project_in.topic,
            section_headings=flat_headings,
        )

        content_by_heading: Dict[str, str] = {
            s["heading"]: s["content"] for s in generated_sections
        }

        global_order_index = 1
        for page_cfg in sorted(project_in.pages, key=lambda p: p.page_number):
            page_number = page_cfg.page_number
            section_titles = page_cfg.sections[:3]

            for idx, title in enumerate(section_titles, start=1):
                content = content_by_heading.get(title, "") or ""

                if not content.strip():
                    content = refine_word_section_with_gemini(
                        topic=project_in.topic,
                        heading=title,
                        current_content="",
                        instruction="Write a clear, professional section for this heading.",
                    )

                section = models.Section(
                    project_id=project.id,
                    title=title,
                    order_index=global_order_index,
                    page_number=page_number,
                    section_index=idx,
                    content=content,
                    history=[
                        {
                            "version": 1,
                            "content": content,
                            "prompt": "initial generation",
                        }
                    ],
                )
                db.add(section)
                global_order_index += 1

        db.commit()
        db.refresh(project)
        return project

    # 2️⃣ OLD FLAT SECTION MODE
    sorted_sections = sorted(project_in.sections, key=lambda s: s.order_index)
    headings = [s.title for s in sorted_sections]

    generated_sections = generate_word_sections_with_gemini(
        topic=project_in.topic,
        section_headings=headings,
    )

    content_by_heading = {s["heading"]: s["content"] for s in generated_sections}

    sections_db: List[models.Section] = []
    for section_in in sorted_sections:
        content = content_by_heading.get(section_in.title, "") or ""

        if not content.strip():
            content = refine_word_section_with_gemini(
                topic=project_in.topic,
                heading=section_in.title,
                current_content="",
                instruction="Write a clear, professional section for this heading.",
            )

        section = models.Section(
            project_id=project.id,
            title=section_in.title,
            order_index=section_in.order_index,
            content=content,
            history=[
                {"version": 1, "content": content, "prompt": "initial generation"}
            ],
        )
        db.add(section)
        sections_db.append(section)

    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_word_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Fetch a single Word project with all its sections.
    """
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.post(
    "/{project_id}/sections/{section_id}/refine",
    response_model=schemas.SectionOut,
)
def refine_section(
    project_id: int,
    section_id: int,
    body: schemas.SectionRefineRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Refine a single section using Gemini based on user's prompt.
    """
    section = (
        db.query(models.Section)
        .join(models.Project)
        .filter(
            models.Section.id == section_id,
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id,
        )
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    new_content = refine_word_section_with_gemini(
        topic=section.project.topic,
        heading=section.title,
        current_content=section.content or "",
        instruction=body.prompt,
    )

    history = section.history or []
    history.append(
        {
            "version": len(history) + 1,
            "prompt": body.prompt,
            "content": new_content,
        }
    )
    section.content = new_content
    section.history = history

    db.commit()
    db.refresh(section)
    return section


@router.post("/{project_id}/sections/{section_id}/feedback")
def set_section_feedback(
    project_id: int,
    section_id: int,
    body: schemas.SectionFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Store like/dislike + optional comment for a section.
    """
    section = (
        db.query(models.Section)
        .join(models.Project)
        .filter(
            models.Section.id == section_id,
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id,
        )
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    section.feedback = body.feedback
    if body.comment:
        section.comment = body.comment

    db.commit()
    return {"status": "ok"}


@router.get("/{project_id}/export")
def export_docx(
    project_id: int,
    db: Session = Depends(get_db),
):
    """
    Dev-friendly export:
    - No auth required
    - Export Word document by project_id only.
    """

    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.doc_type != enums.DocumentType.DOCX:
        raise HTTPException(status_code=400, detail="Project is not a Word document")

    sections = (
        db.query(models.Section)
        .filter(models.Section.project_id == project.id)
        .order_by(
            models.Section.page_number,
            models.Section.section_index,
            models.Section.order_index,
        )
        .all()
    )

    pages: Dict[int, List[Dict[str, str]]] = {}
    for s in sections:
        page_num = s.page_number or 1
        if page_num not in pages:
            pages[page_num] = []
        pages[page_num].append(
            {
                "heading": s.title,
                "content": (s.content or ""),
            }
        )

    file_path = build_docx_file(project.id, project.title, pages)

    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=file_path.name,
    )
