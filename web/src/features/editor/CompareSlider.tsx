import { useCallback, useEffect, useRef, useState } from "react";

interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

export function CompareSlider({ beforeSrc, afterSrc }: CompareSliderProps) {
  const [ratio, setRatio] = useState(0.5);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dragging = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);

  const syncSize = useCallback(() => {
    const img = baseImgRef.current;
    if (!img) return;
    const width = img.clientWidth;
    const height = img.clientHeight;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  }, []);

  useEffect(() => {
    syncSize();
    const img = baseImgRef.current;
    if (!img) return;

    const ro = new ResizeObserver(() => syncSize());
    ro.observe(img);
    window.addEventListener("resize", syncSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, [afterSrc, beforeSrc, syncSize]);

  const update = (clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const next = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setRatio(next);
  };

  return (
    <div
      ref={boxRef}
      className="compare-slider"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) update(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <img
        ref={baseImgRef}
        src={afterSrc}
        alt="处理后"
        className="compare-slider__img"
        draggable={false}
        onLoad={syncSize}
      />

      {size.width > 0 && (
        <div
          className="compare-slider__before"
          style={{ width: `${ratio * 100}%` }}
        >
          <img
            src={beforeSrc}
            alt="处理前"
            className="compare-slider__img compare-slider__img--layer"
            style={{ width: size.width, height: size.height }}
            draggable={false}
          />
        </div>
      )}

      <div className="compare-slider__handle" style={{ left: `${ratio * 100}%` }}>
        <span className="compare-slider__grip" />
      </div>

      <span className="compare-slider__label compare-slider__label--before">处理前</span>
      <span className="compare-slider__label compare-slider__label--after">处理后</span>
    </div>
  );
}
