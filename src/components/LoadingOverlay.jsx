function LoadingOverlay({ progress = 0 }) {
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-title">Loading cave scene</div>
        <div className="loading-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-meta">{progress}%</div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
