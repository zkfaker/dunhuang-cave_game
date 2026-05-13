function TipsOverlay({ onClose }) {
  return (
    <div className="tips-backdrop" role="presentation">
      <div className="tips-card" role="dialog" aria-modal="true">
        <div className="tips-header">
          <div className="tips-title">游玩提示</div>
          <button className="tips-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tips-body">
          <p>游玩提示：pc端游玩体验感更佳，wsad，(↑↓←→)键位可操控移动和视角转换！推荐来pc端游玩！</p>
        </div>
      </div>
    </div>
  );
}

export default TipsOverlay;