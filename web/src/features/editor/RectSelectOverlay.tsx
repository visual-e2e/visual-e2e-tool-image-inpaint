import type { NormalizedRect } from "../../shared/types/mask.types";
import type { RectPreview } from "./useRectSelect";

interface RectSelectOverlayProps {
  width: number;
  height: number;
  enabled: boolean;
  preview: RectPreview | null;
  committedRects: NormalizedRect[];
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
}

export function RectSelectOverlay(props: RectSelectOverlayProps) {
  const {
    width,
    height,
    enabled,
    preview,
    committedRects,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = props;

  if (!width || !height) return null;

  return (
    <div
      className={`rect-select ${enabled ? "is-enabled" : ""}`}
      style={{ pointerEvents: enabled ? "auto" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {committedRects.map((rect, index) => (
        <div
          key={`rect-${index}`}
          className="rect-select__box is-committed"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
        />
      ))}
      {preview && preview.width > 0 && preview.height > 0 && (
        <div
          className="rect-select__box is-preview"
          style={{
            left: `${(preview.x / width) * 100}%`,
            top: `${(preview.y / height) * 100}%`,
            width: `${(preview.width / width) * 100}%`,
            height: `${(preview.height / height) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
