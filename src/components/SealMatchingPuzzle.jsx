import { useEffect, useMemo, useRef, useState } from "react";

function SealMatchingPuzzle({
  tokens,
  slots,
  expected,
  title,
  instruction,
  onClose,
  onComplete,
}) {
  const initialAssignments = useMemo(() => {
    const base = {};
    slots.forEach((slot) => {
      base[slot.id] = null;
    });
    return base;
  }, [slots]);

  const [assignments, setAssignments] = useState(initialAssignments);
  const [status, setStatus] = useState("");
  const resetTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const validateAssignments = (nextAssignments) => {
    const allFilled = slots.every((slot) => nextAssignments[slot.id]);
    if (!allFilled) {
      return;
    }

    const isCorrect = slots.every(
      (slot) => nextAssignments[slot.id] === expected[slot.id]
    );

    if (isCorrect) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    setStatus("对应错误，请重新开始");
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setAssignments(initialAssignments);
      setStatus("");
    }, 800);
  };

  const handleDrop = (slotId, tokenId) => {
    if (!tokenId) {
      return;
    }

    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === tokenId) {
          next[key] = null;
        }
      });
      next[slotId] = tokenId;
      validateAssignments(next);
      return next;
    });
  };

  const handleDragStart = (tokenId) => (event) => {
    event.dataTransfer.setData("text/plain", tokenId);
  };

  const allowDrop = (event) => {
    event.preventDefault();
  };

  const assignedTokenIds = new Set(Object.values(assignments).filter(Boolean));
  const availableTokens = tokens.filter(
    (token) => !assignedTokenIds.has(token.id)
  );

  return (
    <div className="seal-backdrop" role="presentation">
      <div className="seal-card" role="dialog" aria-modal="true">
        <div className="seal-header">
          <div>
            <div className="seal-title">{title}</div>
            <div className="seal-instruction">{instruction}</div>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="seal-content">
          <div className="seal-tokens">
            {availableTokens.map((token) => (
              <div
                key={token.id}
                className="seal-token"
                draggable
                onDragStart={handleDragStart(token.id)}
              >
                {token.label}
              </div>
            ))}
            {availableTokens.length === 0 ? (
              <div className="seal-hint">拖拽印信到凹槽</div>
            ) : null}
          </div>
          <div className="seal-slots">
            {slots.map((slot) => {
              const tokenId = assignments[slot.id];
              const token = tokens.find((item) => item.id === tokenId);
              return (
                <div
                  key={slot.id}
                  className="seal-slot"
                  onDragOver={allowDrop}
                  onDrop={(event) => {
                    event.preventDefault();
                    const tokenFromData = event.dataTransfer.getData(
                      "text/plain"
                    );
                    handleDrop(slot.id, tokenFromData);
                  }}
                >
                  <div className="seal-slot-label">{slot.label}</div>
                  <div className="seal-slot-value">
                    {token ? token.label : "拖拽印信"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="seal-status">{status}</div>
      </div>
    </div>
  );
}

export default SealMatchingPuzzle;
