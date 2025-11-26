# backend/services/content_generator.py

import google.generativeai as genai
import json
import re
from typing import List, Dict, Any

from core.config import Config
from models import enums

# ---------------- Gemini Setup ----------------

genai.configure(
    api_key=Config.GEMMINI_API_KEY if hasattr(Config, "GEMMINI_API_KEY") else Config.GEMINI_API_KEY
)

# One shared model used by PPT + DOCX helpers
model = genai.GenerativeModel("gemini-2.0-flash")


# -------------------------------------------------------
# 1️⃣ PPT CONTENT GENERATION  (with normalization)
# -------------------------------------------------------

def generate_content_with_gemini(topic: str, num_slides: int) -> List[Dict[str, Any]]:
    """
    Generate PPT slide content for a topic using Gemini and normalize
    the output into our SlideContent schema:
      - layout: "title" | "bullet" | "two_column" | "image"
    """

    prompt = f"""
You are an expert presentation designer and educator.

Goal:
Create a highly engaging, logically structured PowerPoint deck on the topic "{topic}" with EXACTLY {num_slides} slides.

Audience:
Beginner to intermediate learners who want clear explanations and practical insights.

Overall flow of the presentation:
- Start with a strong, clear introduction.
- Then explain the core concepts step by step.
- Include practical examples / use-cases.
- Highlight benefits AND challenges / limitations.
- End with a concise summary and call-to-action or next steps.

Content & layout rules:
1. Slide 1 MUST be a pure title slide introducing the topic (no bullets, just a strong title).
2. Slide {num_slides} MUST be a summary / conclusion / call-to-action slide.
3. Other slides should mix these layouts intelligently:
   - Use "title" layout for big section headers or key messages.
   - Use "bullet" layout to explain concepts, lists, pros/cons, or step-by-step flows.
   - Use "two_column" layout for comparisons (Before vs After, Pros vs Cons, Concept vs Example, Theory vs Practice, etc.).
   - Use "image" layout when a diagram / workflow / architecture / chart would help.
4. Avoid repeating the same sentence or idea across different slides.
5. For bullet slides:
   - Use between 3 and 6 bullet points.
   - Each bullet should be an informative sentence, roughly 12–25 words.
   - Do NOT use one-word bullets. Every bullet must carry real information.
6. For two_column slides:
   - The "left" side should focus on explanation, definitions or theory.
   - The "right" side should focus on examples, comparisons, pros/cons, or practical implications.
7. For image slides:
   - Focus on writing a good, descriptive CAPTION (10–30 words) for the image.
   - The backend will choose the actual image URL.
8. Use simple, modern, professional English. No fluff, no marketing buzzwords.
9. Wherever useful, include:
   - Real-world examples
   - Mini use-cases
   - Short scenarios or analogies
10. Do NOT write things like "This slide explains..." or mention "PowerPoint" or "slide" inside the content.

Output format:
Return ONLY a JSON array (no markdown, no backticks, no extra commentary).

Preferred format (if possible):
Each element of the array is ONE slide object with one of these shapes:

1) Title slide:
{{
  "layout": "title",
  "title": "Main title text"
}}

2) Bullet slide:
{{
  "layout": "bullet",
  "title": "Slide heading",
  "bullets": [
    "First bullet point (12–25 words, informative sentence).",
    "Second bullet point (12–25 words, informative sentence)."
  ]
}}

3) Two-column slide:
{{
  "layout": "two_column",
  "title": "Slide heading",
  "left": "Left column text ...",
  "right": "Right column text ..."
}}

4) Image slide:
{{
  "layout": "image",
  "title": "Slide heading",
  "caption": "Short explanatory caption (10-30 words)."
}}

If you cannot follow this format exactly, you may instead return slide objects shaped like:
{{
  "title": "Slide title",
  "content": ["bullet one", "bullet two", "..."],
  "image": "short image description or URL (optional)",
  "notes": "speaker notes or explanation (optional)"
}}

STRICT CONSTRAINTS:
- Produce EXACTLY {num_slides} slide objects in the JSON array.
"""

    try:
        resp = model.generate_content(prompt)
        raw = resp.text or ""
        json_clean = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(json_clean)

        if not isinstance(data, list):
            raise RuntimeError(f"Model returned {type(data)}; expected list")

        normalized_slides: List[Dict[str, Any]] = []

        for idx, slide in enumerate(data):
            if not isinstance(slide, dict):
                continue

            # If already in our layout format, keep as-is (with cleanup)
            if "layout" in slide:
                layout = slide.get("layout")
                if layout == enums.SlideLayout.title.value or layout == "title":
                    normalized_slides.append(
                        {
                            "layout": enums.SlideLayout.title.value,
                            "title": slide.get("title", ""),
                        }
                    )
                elif layout == enums.SlideLayout.bullet.value or layout == "bullet":
                    normalized_slides.append(
                        {
                            "layout": enums.SlideLayout.bullet.value,
                            "title": slide.get("title", ""),
                            "bullets": slide.get("bullets") or [],
                        }
                    )
                elif layout == enums.SlideLayout.two_column.value or layout == "two_column":
                    normalized_slides.append(
                        {
                            "layout": enums.SlideLayout.two_column.value,
                            "title": slide.get("title", ""),
                            "left": slide.get("left", ""),
                            "right": slide.get("right", ""),
                        }
                    )
                elif layout == enums.SlideLayout.image.value or layout == "image":
                    normalized_slides.append(
                        {
                            "layout": enums.SlideLayout.image.value,
                            "title": slide.get("title", ""),
                            "caption": slide.get("caption", slide.get("title", "")),
                        }
                    )
                continue

            # Fallback: Gemini generic format -> our layouts
            title = slide.get("title", "")
            content = slide.get("content")
            image = slide.get("image")
            notes = slide.get("notes")

            # List of bullet-like strings → Bullet slide
            if isinstance(content, list):
                bullets = [str(b).strip() for b in content if str(b).strip()]
                normalized_slides.append(
                    {
                        "layout": enums.SlideLayout.bullet.value,
                        "title": title,
                        "bullets": bullets,
                    }
                )
            # Has image description → Image slide
            elif image:
                normalized_slides.append(
                    {
                        "layout": enums.SlideLayout.image.value,
                        "title": title,
                        "caption": notes or str(image),
                    }
                )
            else:
                # Default to title slide
                normalized_slides.append(
                    {
                        "layout": enums.SlideLayout.title.value,
                        "title": title,
                    }
                )

        # Ensure we have exactly num_slides slides
        if len(normalized_slides) < num_slides:
            for i in range(len(normalized_slides), num_slides):
                normalized_slides.append(
                    {
                        "layout": enums.SlideLayout.title.value,
                        "title": f"Slide {i + 1}",
                    }
                )
        elif len(normalized_slides) > num_slides:
            normalized_slides = normalized_slides[:num_slides]

        # Ensure image slides have caption + image_url
        for idx, s in enumerate(normalized_slides):
            if s.get("layout") == enums.SlideLayout.image.value or s.get("layout") == "image":
                if not s.get("caption") or not isinstance(s.get("caption"), str):
                    s["caption"] = (s.get("title", "") or "")[:120]

                seed = re.sub(r"[^a-zA-Z0-9]", "", f"{topic}_{idx}") or f"slide_{idx}"
                s["image_url"] = f"https://picsum.photos/seed/{seed}/1200/800"

        return normalized_slides

    except Exception as e:
        print("Gemini PPT content generation failed:", e)
        raise RuntimeError("Gemini content generation failed")



# -------------------------------------------------------
# 2️⃣ WORD (.DOCX) CONTENT GENERATION – UPDATED
# -------------------------------------------------------

def generate_word_sections_with_gemini(topic: str, section_headings: List[str]) -> List[Dict[str, Any]]:
    """
    Generate initial content for a Word document.

    section_headings: ["Introduction", "Market Overview", "Challenges", "Conclusion", ...]
    Returns: [
      {"heading": "...", "order_index": 1, "content": "..."},
      ...
    ]
    """
    headings_str = "\n".join(f"- {h}" for h in section_headings)

    prompt = f"""
You are an expert business writer creating a professional Word document.

MAIN TOPIC:
{topic}


The document will have the following SECTIONS (each ONE subtopic), in this exact order:
{headings_str}

Think like this:
- The user has already chosen section headings.
- EACH heading is one conceptual subtopic (e.g., "Market Segmentation", "Technology Trends", "Growth Drivers").
- You ONLY write the body text under each heading. You do NOT invent page/section labels.

🚫 ABSOLUTELY FORBIDDEN (DO NOT DO THIS):

1) NO page / section labels
   - Do NOT write any lines like:
     * "Page 1 – Section 1"
     * "Page 2 – Section 3"
     * "Section 1: Introduction"
     * "Section 2: Growth Drivers"
     * "Section 3: Market Segmentation"
     * "Chapter 1", "Part 2", etc.
   - Do NOT write the main document title again.
   - Do NOT repeat the section heading as the first line.
   - Do NOT start ANY line with the words "Page", "Section", "Chapter", or "Part" followed by a number or dash.

2) Subtopic separation / no duplication
   - Treat each heading as a distinct subtopic based on the MAIN TOPIC and the heading text.
   - Do NOT re-explain the exact same concept in multiple sections.
   - If one section discusses market segmentation in detail, do NOT explain segmentation again in another section.
   - If you need to refer back, use short references like "As discussed earlier" instead of repeating full explanations.

3) Style and length
   - Use professional but simple English.
   - For each heading, write 2–4 short paragraphs (1–3 is fine for Conclusion or Summary).
   - Paragraphs must be compact and information-dense, not huge blocks.
   - Focus on analysis, concrete data/examples, and practical insights that fit that subtopic.

4) Formatting
   - Output PLAIN TEXT only for the section body.
   - Use "\\n" inside the JSON string to indicate paragraph breaks.
   - Do NOT use bullets ("-", "*", "1.") unless the heading clearly requires a list.
   - Do NOT include markdown like **bold**, _italics_, # headings, or code blocks.

5) Output format (STRICT)
Return ONLY a JSON array (no markdown, no commentary). Each element MUST be:

{{
  "heading": "Exactly one of the provided headings above",
  "order_index": <1-based index of that heading in the original list>,
  "content": "The full text for that section as plain text with '\\n' between paragraphs."
}}

- Include ONE object for EVERY heading in section_headings.
- "heading" must exactly match one of the provided headings.
- "order_index" must match the heading's position in the original list (first heading = 1, second = 2, etc.).
"""


    try:
        resp = model.generate_content(prompt)
        json_data = resp.text
        json_clean = re.sub(r"```json|```", "", json_data).strip()
        sections = json.loads(json_clean)

        if not isinstance(sections, list):
            raise RuntimeError(f"Model returned {type(sections)}; expected list")

        # Sort by order_index to be safe
        sections.sort(key=lambda s: s.get("order_index", 0))

        # Extra safety cleanup: strip "Page 1 – Section 1", "Section 2:" etc. if Gemini still adds them
        cleaned_sections: List[Dict[str, Any]] = []
        for s in sections:
            content = s.get("content", "") or ""

            # Remove leading "Page X – Section Y" lines
            content = re.sub(
                r"^(Page|page)\s*\d+\s*[-–]\s*(Section|section)\s*\d+\s*\n*",
                "",
                content
            )
            # Remove leading "Section N:" style labels
            content = re.sub(
                r"^(Section|section)\s*\d+\s*[:\-]\s*",
                "",
                content
            )

            # Also remove if it starts with the main topic line
            first_line, *rest = content.split("\n", 1)
            if first_line.strip() == topic.strip():
                content = rest[0] if rest else ""

            s["content"] = content.strip()
            cleaned_sections.append(s)

        return cleaned_sections

    except Exception as e:
        print("Gemini Word content generation failed:", e)
        raise RuntimeError("Gemini Word content generation failed")


def refine_word_section_with_gemini(
    topic: str,
    heading: str,
    current_content: str,
    instruction: str,
) -> str:
    """
    Refine a single section in the Word document.

    instruction examples:
      - "Make this more formal"
      - "Shorten to about 120 words"
      - "Convert to bullet points"
    """
    prompt = f"""
You are revising ONE section of a professional business Word document.

Main topic: {topic}
Section heading: {heading}

Current section content:
\"\"\"{current_content}\"\"\"

User refinement instruction:
\"\"\"{instruction}\"\"\"

Rewrite ONLY this section according to the instruction.

Rules:
- Keep meaning and key information intact.
- Apply the user's style/length instructions carefully.
- Output plain text only.
- Use '\\n' for paragraph breaks.
- Do NOT add the heading, section numbers, or any meta commentary.
"""

    try:
        resp = model.generate_content(prompt)
        return resp.text.strip()
    except Exception as e:
        print("Gemini Word refinement failed:", e)
        raise RuntimeError("Gemini Word refinement failed")