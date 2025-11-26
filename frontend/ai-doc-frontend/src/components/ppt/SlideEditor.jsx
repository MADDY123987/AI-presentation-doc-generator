{/* FOOTER: only save slide (feedback removed) */}
<div className="slide-card-footer">
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
