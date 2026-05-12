function LoadingOverlay({ progress = 0 }) {
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-title">你好，正在加载洞窟场景</div>
        <div className="loading-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-meta">{progress}%</div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
