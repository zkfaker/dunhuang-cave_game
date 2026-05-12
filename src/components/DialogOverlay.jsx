function DialogOverlay({
  title,
  body,
  imageSrc,
  imageAlt,
  onClose,
  variant = "default",
  primaryLabel,
  onPrimary,
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className={`dialog-card dialog-card--${variant}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-header">
          <div className="dialog-title">{title}</div>
          <button className="dialog-close" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="dialog-body">
          {imageSrc ? (
            <img
              className="dialog-image"
              src={imageSrc}
              alt={imageAlt || ""}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className="dialog-text">{body}</div>
        </div>
        {primaryLabel ? (
          <div className="dialog-actions">
            <button
              className="dialog-primary"
              type="button"
              onClick={onPrimary}
            >
              {primaryLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DialogOverlay;
