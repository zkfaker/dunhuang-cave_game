import { useMemo, useState } from "react";

function ImageSequencePuzzle({
  images,
  initialOrder,
  expectedOrder,
  title,
  instruction,
  onComplete,
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const orderedImages = useMemo(() => {
    const map = new Map(images.map((image) => [image.id, image]));
    return initialOrder.map((id) => map.get(id)).filter(Boolean);
  }, [images, initialOrder]);

  const handleSelect = (id) => {
    const expectedId = expectedOrder[currentIndex];
    if (id === expectedId) {
      const nextIndex = currentIndex + 1;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      if (nextIndex >= expectedOrder.length) {
        if (onComplete) {
          onComplete();
        }
      } else {
        setCurrentIndex(nextIndex);
        setStatus(`已确认 ${nextIndex}/${expectedOrder.length}`);
      }
      return;
    }

    setCurrentIndex(0);
    setSelectedIds(new Set());
    setStatus("顺序错误，请重新开始");
  };

  return (
    <div className="puzzle-backdrop" role="presentation">
      <div className="puzzle-card" role="dialog" aria-modal="true">
        <div className="puzzle-header">
          <div>
            <div className="puzzle-title">{title}</div>
            <div className="puzzle-instruction">{instruction}</div>
          </div>
          <button className="dialog-close" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="puzzle-grid">
          {orderedImages.map((image) => (
            <button
              key={image.id}
              type="button"
              className={
                selectedIds.has(image.id)
                  ? "puzzle-tile puzzle-tile--selected"
                  : "puzzle-tile"
              }
              onClick={() => handleSelect(image.id)}
            >
              <img
                src={image.src}
                alt={image.alt || image.label}
                loading="lazy"
              />
            </button>
          ))}
        </div>
        <div className="puzzle-status">
          {status || `当前进度 ${currentIndex}/${expectedOrder.length}`}
        </div>
      </div>
    </div>
  );
}

export default ImageSequencePuzzle;
