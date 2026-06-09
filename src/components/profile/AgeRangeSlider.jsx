/* b44-full-sync 2026-06-01 */
import { useRef, useState, useCallback } from 'react';

export default function AgeRangeSlider({ min = 18, max = 65, value, onChange }) {
  const [minVal, maxVal] = value;
  const trackRef = useRef(null);
  const dragging = useRef(null);

  const getPercent = v => ((v - min) / (max - min)) * 100;

  const getValFromX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return min;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * (max - min) + min);
  }, [min, max]);

  const handleMove = useCallback((clientX) => {
    const val = getValFromX(clientX);
    if (dragging.current === 'min') {
      onChange([Math.min(val, maxVal - 1), maxVal]);
    } else if (dragging.current === 'max') {
      onChange([minVal, Math.max(val, minVal + 1)]);
    }
  }, [minVal, maxVal, onChange, getValFromX]);

  const startDrag = (thumb) => (e) => {
    e.preventDefault();
    dragging.current = thumb;
    const move = (ev) => handleMove(ev.touches ? ev.touches[0].clientX : ev.clientX);
    const up = () => { dragging.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  const leftPct = getPercent(minVal);
  const rightPct = getPercent(maxVal);

  return (
    <div className="px-2 py-3">
      <div className="flex justify-between text-sm mb-3">
        <span className="text-muted-foreground">Возраст</span>
        <span className="font-semibold text-sm px-2.5 py-0.5 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}>
          {minVal} – {maxVal}
        </span>
      </div>

      <div ref={trackRef} className="relative h-10 flex items-center select-none">
        {/* track bg */}
        <div className="absolute w-full h-1.5 rounded-full bg-white/10" />
        {/* active track */}
        <div
          className="absolute h-1.5 rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
            background: 'linear-gradient(90deg, hsl(270,80%,60%), hsl(330,85%,60%))',
            boxShadow: '0 0 8px rgba(168,85,247,0.5)',
          }}
        />
        {/* min thumb */}
        <div
          className="absolute w-6 h-6 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 touch-none"
          style={{
            left: `${leftPct}%`,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))',
            boxShadow: '0 0 12px rgba(168,85,247,0.6)',
          }}
          onMouseDown={startDrag('min')}
          onTouchStart={startDrag('min')}
        >
          <div className="w-2 h-2 rounded-full bg-white/80" />
        </div>
        {/* max thumb */}
        <div
          className="absolute w-6 h-6 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 touch-none"
          style={{
            left: `${rightPct}%`,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))',
            boxShadow: '0 0 12px rgba(168,85,247,0.6)',
          }}
          onMouseDown={startDrag('max')}
          onTouchStart={startDrag('max')}
        >
          <div className="w-2 h-2 rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  );
}