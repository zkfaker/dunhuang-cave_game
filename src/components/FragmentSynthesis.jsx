function FragmentSynthesis({ title, fragments, description, onSynthesize }) {
  return (
    <div className="synthesis-backdrop" role="presentation">
      <div className="synthesis-card" role="dialog" aria-modal="true">
        <div className="synthesis-title">{title}</div>
        <div className="synthesis-grid">
          {fragments.map((fragment) => (
            <div key={fragment} className="synthesis-fragment">
              {fragment}
            </div>
          ))}
        </div>
        <div className="synthesis-description">{description}</div>
        <button
          type="button"
          className="synthesis-button"
          onClick={onSynthesize}
        >
          合成
        </button>
      </div>
    </div>
  );
}

export default FragmentSynthesis;
