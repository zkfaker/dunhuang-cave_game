function MovementControls({ onMoveStart, onMoveEnd }) {
  const handlePointerDown = (direction) => (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (onMoveStart) {
      onMoveStart(direction);
    }
  };

  const handlePointerUp = (direction) => (event) => {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (onMoveEnd) {
      onMoveEnd(direction);
    }
  };

  const handlePointerCancel = (direction) => (event) => {
    event.preventDefault();
    if (onMoveEnd) {
      onMoveEnd(direction);
    }
  };

  return (
    <>
      <div
        className="move-controls move-controls-left"
        aria-label="Movement controls"
      >
        <button
          className="move-btn move-forward"
          type="button"
          onPointerDown={handlePointerDown("forward")}
          onPointerUp={handlePointerUp("forward")}
          onPointerLeave={handlePointerUp("forward")}
          onPointerCancel={handlePointerCancel("forward")}
        >
          前进
        </button>
        <button
          className="move-btn move-left"
          type="button"
          onPointerDown={handlePointerDown("left")}
          onPointerUp={handlePointerUp("left")}
          onPointerLeave={handlePointerUp("left")}
          onPointerCancel={handlePointerCancel("left")}
        >
          左移
        </button>
        <button
          className="move-btn move-right"
          type="button"
          onPointerDown={handlePointerDown("right")}
          onPointerUp={handlePointerUp("right")}
          onPointerLeave={handlePointerUp("right")}
          onPointerCancel={handlePointerCancel("right")}
        >
          右移
        </button>
        <button
          className="move-btn move-back"
          type="button"
          onPointerDown={handlePointerDown("backward")}
          onPointerUp={handlePointerUp("backward")}
          onPointerLeave={handlePointerUp("backward")}
          onPointerCancel={handlePointerCancel("backward")}
        >
          后退
        </button>
      </div>
      <div
        className="move-controls move-controls-right"
        aria-label="Elevation and rotation controls"
      >
        <button
          className="move-btn move-rotate-left"
          type="button"
          onPointerDown={handlePointerDown("rotateLeft")}
          onPointerUp={handlePointerUp("rotateLeft")}
          onPointerLeave={handlePointerUp("rotateLeft")}
          onPointerCancel={handlePointerCancel("rotateLeft")}
        >
          左转
        </button>
        <button
          className="move-btn move-rotate-right"
          type="button"
          onPointerDown={handlePointerDown("rotateRight")}
          onPointerUp={handlePointerUp("rotateRight")}
          onPointerLeave={handlePointerUp("rotateRight")}
          onPointerCancel={handlePointerCancel("rotateRight")}
        >
          右转
        </button>
        <button
          className="move-btn move-up"
          type="button"
          onPointerDown={handlePointerDown("up")}
          onPointerUp={handlePointerUp("up")}
          onPointerLeave={handlePointerUp("up")}
          onPointerCancel={handlePointerCancel("up")}
        >
          上升
        </button>
        <button
          className="move-btn move-down"
          type="button"
          onPointerDown={handlePointerDown("down")}
          onPointerUp={handlePointerUp("down")}
          onPointerLeave={handlePointerUp("down")}
          onPointerCancel={handlePointerCancel("down")}
        >
          下降
        </button>
      </div>
    </>
  );
}

export default MovementControls;
