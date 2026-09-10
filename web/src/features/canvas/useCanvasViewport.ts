import { useCallback, useState } from "react";

export function useCanvasViewport() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, Number((s + 0.1).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.25, Number((s - 0.1).toFixed(2))));
  }, []);

  const setZoom = useCallback((value: number) => {
    setScale(Math.min(3, Math.max(0.25, value)));
  }, []);

  const fit = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const resetPan = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  return {
    scale,
    offset,
    setOffset,
    panMode,
    setPanMode,
    zoomIn,
    zoomOut,
    setZoom,
    fit,
    resetPan,
  };
}
