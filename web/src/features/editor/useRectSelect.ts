import { useCallback, useRef, useState } from "react";
import type { NormalizedRect } from "../../shared/types/mask.types";

const MIN_RECT_PX = 4;

export interface RectPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseRectSelectOptions {
  width: number;
  height: number;
  enabled: boolean;
  onRectEnd?: (rect: NormalizedRect) => void;
}

function toNormalized(
  box: RectPreview,
  width: number,
  height: number,
): NormalizedRect | null {
  if (box.width < MIN_RECT_PX || box.height < MIN_RECT_PX) return null;
  return {
    x: box.x / width,
    y: box.y / height,
    width: box.width / width,
    height: box.height / height,
  };
}

export function useRectSelect(options: UseRectSelectOptions) {
  const { width, height, enabled, onRectEnd } = options;
  const drawing = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const previewRef = useRef<RectPreview | null>(null);
  const [preview, setPreview] = useState<RectPreview | null>(null);

  const toImagePoint = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * width;
      const y = ((event.clientY - rect.top) / rect.height) * height;
      return {
        x: Math.min(width, Math.max(0, x)),
        y: Math.min(height, Math.max(0, y)),
      };
    },
    [width, height],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!enabled || !width || !height) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = toImagePoint(event);
    start.current = p;
    const next = { x: p.x, y: p.y, width: 0, height: 0 };
    previewRef.current = next;
    setPreview(next);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!enabled || !drawing.current || !start.current) return;
    const p = toImagePoint(event);
    const x0 = start.current.x;
    const y0 = start.current.y;
    const next = {
      x: Math.min(x0, p.x),
      y: Math.min(y0, p.y),
      width: Math.abs(p.x - x0),
      height: Math.abs(p.y - y0),
    };
    previewRef.current = next;
    setPreview(next);
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    start.current = null;
    const box = previewRef.current;
    previewRef.current = null;
    setPreview(null);
    if (!box || !onRectEnd || !width || !height) return;
    const normalized = toNormalized(box, width, height);
    if (normalized) onRectEnd(normalized);
  };

  return {
    preview,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
  };
}
