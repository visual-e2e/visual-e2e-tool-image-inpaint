import { useRef } from "react";
import { ProcessingOverlay } from "./ProcessingOverlay";

interface CanvasStageProps {
  scale: number;
  offset: { x: number; y: number };
  panMode: boolean;
  onPan: (next: { x: number; y: number }) => void;
  processing: boolean;
  children: React.ReactNode;
  floatingBar: React.ReactNode;
  empty?: React.ReactNode;
}

export function CanvasStage(props: CanvasStageProps) {
  const {
    scale,
    offset,
    panMode,
    onPan,
    processing,
    children,
    floatingBar,
    empty,
  } = props;
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  return (
    <div className="canvas-stage">
      <div
        className={`canvas-stage__viewport ${panMode ? "is-pan" : ""}`}
        onPointerDown={(e) => {
          if (!panMode) return;
          dragging.current = true;
          last.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!panMode || !dragging.current) return;
          const dx = e.clientX - last.current.x;
          const dy = e.clientY - last.current.y;
          last.current = { x: e.clientX, y: e.clientY };
          onPan({ x: offset.x + dx, y: offset.y + dy });
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {empty ?? (
          <div
            className="canvas-stage__content"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          >
            {children}
          </div>
        )}
        <ProcessingOverlay visible={processing} />
      </div>
      {floatingBar}
    </div>
  );
}
