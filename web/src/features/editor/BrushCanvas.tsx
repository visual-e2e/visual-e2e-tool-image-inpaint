import type { RefObject } from "react";

interface BrushCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  enabled: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
}

export function BrushCanvas(props: BrushCanvasProps) {
  const {
    canvasRef,
    width,
    height,
    enabled,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = props;

  return (
    <canvas
      ref={canvasRef as RefObject<HTMLCanvasElement>}
      className="brush-canvas"
      width={width}
      height={height}
      style={{ pointerEvents: enabled ? "auto" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}
