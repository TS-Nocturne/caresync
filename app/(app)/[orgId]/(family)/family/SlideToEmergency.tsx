"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SlideToEmergencyProps {
  onActivate: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const THRESHOLD = 0.85; // 85% of track width to activate

export default function SlideToEmergency({
  onActivate,
  disabled = false,
  loading = false,
}: SlideToEmergencyProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [activated, setActivated] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const startXRef = useRef(0);
  const thumbWidth = 72; // px
  const maxOffset = Math.max(1, trackWidth - thumbWidth - 8);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateWidth = () => setTrackWidth(track.offsetWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(track);

    return () => resizeObserver.disconnect();
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || loading || activated) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      startXRef.current = e.clientX - offsetX;
    },
    [disabled, loading, activated, offsetX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const newOffset = Math.max(0, Math.min(e.clientX - startXRef.current, maxOffset));
      setOffsetX(newOffset);
    },
    [dragging, maxOffset]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(false);

      const progress = offsetX / maxOffset;

      if (progress >= THRESHOLD) {
        // Activated!
        setActivated(true);
        setOffsetX(maxOffset);

        // Haptic vibration if supported
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 200]);
        }

        // Delay callback slightly for visual feedback
        setTimeout(() => {
          onActivate();
        }, 300);
      } else {
        // Spring back
        setOffsetX(0);
      }
    },
    [dragging, offsetX, maxOffset, onActivate]
  );

  const progress = offsetX / maxOffset;
  const textOpacity = Math.max(0, 1 - progress * 2);

  return (
    <div className="slide-emergency-container">
      <p className="slide-emergency-label">
        ☎️ ส่งข้อความขอความช่วยเหลือ
      </p>
      <div
        ref={trackRef}
        className={`slide-emergency-track ${activated ? "slide-emergency-track--activated" : ""} ${disabled || loading ? "slide-emergency-track--disabled" : ""}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Track background glow */}
        <div
          className="slide-emergency-fill"
          style={{ width: `${offsetX + thumbWidth + 4}px` }}
        />

        {/* Sliding text */}
        <div
          className="slide-emergency-text"
          style={{ opacity: textOpacity }}
        >
          <span className="slide-emergency-arrows">›››</span>
          <span>ไสด์เพื่อส่งข้อความถึงครอบครัว</span>
          <span className="slide-emergency-arrows">›››</span>
        </div>

        {/* Activated text */}
        {activated && (
          <div className="slide-emergency-text slide-emergency-text--activated">
            <span>กำลังส่งข้อความขอความช่วยเหลือ...</span>
          </div>
        )}

        {/* Thumb */}
        <div
          className={`slide-emergency-thumb ${dragging ? "slide-emergency-thumb--dragging" : ""} ${activated ? "slide-emergency-thumb--activated" : ""}`}
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: dragging ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onPointerDown={handlePointerDown}
        >
          {loading ? (
            <div className="slide-emergency-spinner" />
          ) : (
            <span className="slide-emergency-icon">☎️</span>
          )}
        </div>
      </div>

      <p className="slide-emergency-hint">
        ไสด์ปุ่มจากซ้ายไปขวาเพื่อส่งข้อความขอความช่วยเหลือถึงครอบครัวทุกคน
      </p>
    </div>
  );
}
