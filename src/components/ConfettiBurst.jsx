import { useEffect, useMemo } from "react";

function ConfettiBurst({ onComplete }) {
  const pieces = useMemo(() => {
    return Array.from({ length: 18 }).map((_, index) => ({
      id: `piece-${index}`,
      left: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 0.2}s`,
      rotation: `${Math.random() * 160 - 80}deg`,
    }));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotation})`,
          }}
        />
      ))}
    </div>
  );
}

export default ConfettiBurst;
