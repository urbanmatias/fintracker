import { useState, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
  className?: string;
}

export default function SwipeableRow({ children, onDelete, threshold = 80, className = '' }: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const currentXRef = useRef(0);
  const triggeredHapticRef = useRef(false);
  const haptic = useHaptic();

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    lockedRef.current = null;
    currentXRef.current = translateX;
    triggeredHapticRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;

    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Lock direction once user moves enough
    if (lockedRef.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        lockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
    }

    if (lockedRef.current !== 'horizontal') return;

    const next = Math.max(Math.min(currentXRef.current + dx, 0), -threshold * 1.5);
    setTranslateX(next);

    // Haptic when crossing the threshold
    if (next <= -threshold && !triggeredHapticRef.current) {
      haptic.trigger('medium');
      triggeredHapticRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (translateX <= -threshold) {
      haptic.trigger('heavy');
      setAnimating(true);
      setTranslateX(-window.innerWidth);
      setTimeout(onDelete, 200);
    } else {
      setTranslateX(0);
    }
    startXRef.current = null;
    startYRef.current = null;
    lockedRef.current = null;
  };

  return (
    <div className={`swipe-row ${className}`}>
      <button
        type="button"
        onClick={() => {
          haptic.trigger('heavy');
          setAnimating(true);
          setTranslateX(-window.innerWidth);
          setTimeout(onDelete, 200);
        }}
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
