import { useState, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
}

export default function SwipeableRow({ children, onDelete, threshold = 80 }: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const delta = e.touches[0].clientX - startXRef.current;
    const next = Math.max(Math.min(currentXRef.current + delta, 0), -threshold * 1.5);
    setTranslateX(next);
  };

  const handleTouchEnd = () => {
    if (translateX <= -threshold) {
      // Animate out then trigger delete
      setAnimating(true);
      setTranslateX(-threshold);
    } else {
      setTranslateX(0);
    }
    startXRef.current = null;
  };

  const triggerDelete = () => {
    setAnimating(true);
    setTranslateX(-window.innerWidth);
    setTimeout(onDelete, 200);
  };

  return (
    <div className="swipe-row">
      <button
        type="button"
        onClick={triggerDelete}
        className="swipe-action"
        aria-label="Eliminar"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <div
        className="swipe-content bg-surface"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: animating || startXRef.current === null ? 'transform 0.2s ease' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
