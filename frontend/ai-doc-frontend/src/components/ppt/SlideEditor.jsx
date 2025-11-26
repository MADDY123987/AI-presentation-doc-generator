import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../config";
import "./slide-editor.css";

const DEBOUNCE_MS = 800;
const SAMPLE_IMAGE = "/mnt/data/cf6a33ff-d0bc-4e56-89d7-6a9513516d8a.png";

function SlideEditor({ index, slide, presentationId, onLocalChange, onSave }) {
  const [title, setTitle] = useState(slide.title || "");
  const [bulletsText, setBulletsText] = useState(
    (slide.bullets || []).join("\n")
  );
  const [left, setLeft] = useState(slide.left || "");
  const [right, setRight] = useState(slide.right || "");
  const [imageUrl, setImageUrl] = useState(slide.image_url || SAMPLE_IMAGE);
  const [caption, setCaption] = useState(
    slide.caption || slide.description || ""
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Saved");

  // 👇 NEW: per-slide feedback state
  const [reaction, setReaction] = useState(slide.reaction || null); // "like" | "dislike" | null
  const [comment, setComment] = useState(slide.comment || "");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("Feedback not saved yet");

  const timerRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // keep in sync if parent updates slide externally
  useEffect(() => {
    setTitle(slide.title || "");
    setBulletsText((slide.bullets || []).join("\n"));
    setLeft(slide.left || "");
    setRight(slide.right || "");
    setImageUrl(slide.image_url || SAMPLE_IMAGE);
    setCaption(slide.caption || slide.description || "");

    // 👇 sync feedback fields if backend sends them
    setReaction(slide.reaction || null);
    setComment(slide.comment || "");
  }, [slide]);

  // Build minimal payload matching SlideUpdate schema
  const buildPayload = () => {
    const payload = {};
    if (title !== (slide.title || "")) payload.title = title;

    const layout = slide.layout || "custom";
    if (layout === "bullet") {
      const bullets = bulletsText
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);
      const orig = slide.bullets || [];
      const same =
        bullets.length === orig.length && bullets.every((b, i) => b === orig[i]);
      if (!same) payload.bullets = bullets;
    } else if (layout === "two_column") {
      if (left !== (slide.left || "")) payload.left = left;
      if (right !== (slide.right || "")) payload.right = right;
    } else if (layout === "image") {
      if (imageUrl !== (slide.image_url || "")) payload.image_url = imageUrl;
      if (caption !== (slide.caption || slide.description || "")) {
        payload.caption = caption;
      }
    } else {
      // custom/title: title handled above
    }

    return payload;
  };

  const notifyLocal = (payload) => {
    if (onLocalChange && Object.keys(payload).length > 0) {
      try {
        const merged = { ...slide, ...payload };
        onLocalChange(index, merged);
      } catch (e) {
        console.warn("onLocalChange error:", e);
      }
    }
  };

  const saveToBackend = async (payload) => {
    if (!presentationId || Object.keys(payload).length === 0) return;
    setSaving(true);
    setStatusMsg("Saving…");
    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${BASE_URL}/presentations/${presentationId}/slides/${index}`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (mounted.current) {
        setSaving(false);
        setStatusMsg("Saved");
      }
    } catch (err) {
      console.error("Slide autosave failed:", err);
      if (mounted.current) {
        setSaving(false);
        setStatusMsg("Error saving");
      }
    }
  };

  const triggerSaveDebounced = () => {
    const payload = buildPayload();
    notifyLocal(payload);

    if (!presentationId) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveToBackend(payload);
      timerRef.current = null;
    }, DEBOUNCE_MS);
  };

  const handleManualSave = async () => {
    const payload = buildPayload();
    notifyLocal(payload);

    if (onSave) {
      onSave(index, payload);
      return;
    }
    await saveToBackend(payload);
  };

  /* --- NEW: feedback submit helper --- */
  const submitFeedback = async (nextReaction = reaction, nextComment = comment) => {
    // if no backend id, just keep it local
    if (!presentationId) {
      setFeedbackStatus("Feedback stored locally");
      return;
    }

    try {
      setFeedbackSaving(true);
      setFeedbackStatus("Saving feedback…");

      const token = localStorage.getItem("authToken");
      const payload = {
        reaction: nextReaction, // "like" | "dislike" | null
        comment: nextComment,
      };

      await axios.post(
        `${BASE_URL}/presentations/${presentationId}/slides/${index}/feedback`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (mounted.current) {
        setFeedbackSaving(false);
        setFeedbackStatus("Feedback saved");
      }

      // reflect in parent if needed
      if (onLocalChange) {
        onLocalChange(index, {
          ...slide,
          reaction: nextReaction,
          comment: nextComment,
        });
      }
    } catch (err) {
      console.error("Saving feedback failed:", err);
      if (mounted.current) {
        setFeedbackSaving(false);
        setFeedbackStatus("Error saving feedback");
      }
    }
  };

  const handleReactionClick = (type) => {
    // toggle behavior: click again to clear
    const next =
      reaction === type
        ? null
        : type; // either "like", "dislike", or null

    setReaction(next);
    submitFeedback(next, comment);
  };

  const handleCommentBlur = () => {
    // save comment when user leaves the textarea
    submitFeedback(reaction, comment);
  };

  /* --- Handlers when editing the preview (contentEditable elements) --- */

  const onTitleInput = (e) => {
    const v = e.currentTarget.innerText.replace(/\u00A0/g, " ");
    setTitle(v);
    triggerSaveDebounced();
  };

  const onBulletsInput = (e) => {
    const text = e.currentTarget.innerText.replace(/\u00A0/g, " ");
    setBulletsText(text);
    triggerSaveDebounced();
  };

  const onLeftInput = (e) => {
    const v = e.currentTarget.innerText.replace(/\u00A0/g, " ");
    setLeft(v);
    triggerSaveDebounced();
  };

  const onRightInput = (e) => {
    const v = e.currentTarget.innerText.replace(/\u00A0/g, " ");
    setRight(v);
    triggerSaveDebounced();
  };

  const onCaptionInput = (e) => {
    const v = e.currentTarget.innerText.replace(/\u00A0/g, " ");
    setCaption(v);
    triggerSaveDebounced();
  };

  const onImageUrlChange = (v) => {
    setImageUrl(v);
    triggerSaveDebounced();
  };

  const bulletsPreview = bulletsText
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  const layoutLabel =
    slide.layout === "bullet"
      ? "Bullet points"
      : slide.layout === "two_column"
      ? "Two column"
      : slide.layout === "image"
      ? "Image"
      : slide.layout === "title"
      ? "Title"
      : "Custom";

  return (
    <div className="slide-card">
      <div className="slide-card-header">
        <span className="slide-badge">Slide {index + 1}</span>
        <span className="slide-layout-pill">{layoutLabel}</span>
      </div>

      <input
        className="slide-title-input visually-hidden"
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          triggerSaveDebounced();
        }}
        aria-hidden="true"
      />

      <div
        className="slide-preview slide-preview-editable"
        aria-label={`Slide ${index + 1} editor`}
      >
        <div
          className="slide-preview-title editable"
          contentEditable
          suppressContentEditableWarning
          onInput={onTitleInput}
          role="textbox"
          aria-label={`Edit title for slide ${index + 1}`}
        >
          {title || `Slide ${index + 1} title`}
        </div>

        <div className="slide-preview-content">
          {slide.layout === "bullet" && (
            <div
              className="slide-bullet-editor editable"
              contentEditable
              suppressContentEditableWarning
              onInput={onBulletsInput}
              role="textbox"
              aria-label={`Edit bullets for slide ${index + 1}`}
            >
              {bulletsPreview.length > 0 ? (
                bulletsPreview.map((b, i) => (
                  <div key={i} className="bullet-line">
                    {b}
                  </div>
                ))
              ) : (
                <>
                  <div className="bullet-line">First key point</div>
                  <div className="bullet-line">Second key point</div>
                  <div className="bullet-line">Third key point</div>
                </>
              )}
            </div>
          )}

          {slide.layout === "two_column" && (
            <div className="slide-preview-cols">
              <div
                className="slide-preview-col editable"
                contentEditable
                suppressContentEditableWarning
                onInput={onLeftInput}
                role="textbox"
                aria-label={`Edit left column for slide ${index + 1}`}
              >
                {left || "Left column content"}
              </div>

              <div
                className="slide-preview-col editable"
                contentEditable
                suppressContentEditableWarning
                onInput={onRightInput}
                role="textbox"
                aria-label={`Edit right column for slide ${index + 1}`}
              >
                {right || "Right column content"}
              </div>
            </div>
          )}

          {slide.layout === "image" && (
            <div className="slide-image-layout">
              <div className="slide-preview-image-box">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`slide-${index}-img`}
                    className="slide-preview-image"
                  />
                ) : (
                  <span>Image placeholder</span>
                )}
              </div>

              <div
                className="slide-image-caption editable"
                contentEditable
                suppressContentEditableWarning
                onInput={onCaptionInput}
                role="textbox"
                aria-label={`Edit image caption for slide ${index + 1}`}
              >
                {caption || "Image caption (click to edit)"}
              </div>
            </div>
          )}

          {["custom", "title"].includes(slide.layout) && (
            <div
              className="slide-preview-col editable"
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                setTitle(e.currentTarget.innerText);
                triggerSaveDebounced();
              }}
            >
              {slide.layout === "title"
                ? title || `Title slide ${index + 1}`
                : "Add content for this slide layout in the editor."}
            </div>
          )}
        </div>
      </div>

      <div className="slide-hidden-controls" aria-hidden="true">
        <label>
          <span>Bullets (fallback)</span>
          <textarea
            value={bulletsText}
            onChange={(e) => {
              setBulletsText(e.target.value);
              triggerSaveDebounced();
            }}
          />
        </label>

        <label>
          <span>Left (fallback)</span>
          <textarea
            value={left}
            onChange={(e) => {
              setLeft(e.target.value);
              triggerSaveDebounced();
            }}
          />
        </label>

        <label>
          <span>Right (fallback)</span>
          <textarea
            value={right}
            onChange={(e) => {
              setRight(e.target.value);
              triggerSaveDebounced();
            }}
          />
        </label>

        <label>
          <span>Image URL (fallback)</span>
          <input
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            type="text"
          />
        </label>
      </div>

      {/* 🔻 FOOTER: feedback + save slide */}
      <div className="slide-card-footer">
        <div className="slide-feedback-row">
          <div className="feedback-buttons">
            <button
              type="button"
              className={
                reaction === "like"
                  ? "feedback-btn active"
                  : "feedback-btn"
              }
              onClick={() => handleReactionClick("like")}
              disabled={feedbackSaving}
            >
              👍 Like
            </button>
            <button
              type="button"
              className={
                reaction === "dislike"
                  ? "feedback-btn active"
                  : "feedback-btn"
              }
              onClick={() => handleReactionClick("dislike")}
              disabled={feedbackSaving}
            >
              👎 Dislike
            </button>

            <span className="feedback-status">
              {feedbackStatus}
            </span>
          </div>

          <textarea
            className="feedback-comment-input"
            placeholder="Add a comment or note for this slide (saved automatically)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={handleCommentBlur}
            rows={2}
          />
        </div>

        <div className="slide-footer-actions">
          <div className="save-status" aria-hidden>
            {statusMsg}
          </div>
          <button
            className="slide-save-btn"
            onClick={handleManualSave}
            disabled={saving}
            title="Force save now"
          >
            💾 Save Slide
          </button>
        </div>
      </div>
    </div>
  );
}

export default SlideEditor;
