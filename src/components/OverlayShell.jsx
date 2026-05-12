function OverlayShell({ debug = false, message = "" }) {
  return (
    <div className="overlay-shell">
      {debug ? (
        <div className="overlay-chip">
          Calibrate mode: press C to copy view
          {message ? ` · ${message}` : ""}
        </div>
      ) : null}
    </div>
  );
}

export default OverlayShell;
