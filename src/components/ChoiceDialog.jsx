function ChoiceDialog({ title, body, options, status, onSelect, onClose }) {
  return (
    <div className="choice-backdrop" role="presentation">
      <div className="choice-card" role="dialog" aria-modal="true">
        <div className="choice-header">
          <div className="choice-title">{title}</div>
          <button className="dialog-close" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="choice-body">{body}</div>
        <div className="choice-options">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="choice-option"
              onClick={() => onSelect(option.id)}
            >
              <span className="choice-label">{option.id}</span>
              <span className="choice-text">{option.text}</span>
            </button>
          ))}
        </div>
        <div className="choice-status">{status}</div>
      </div>
    </div>
  );
}

export default ChoiceDialog;
