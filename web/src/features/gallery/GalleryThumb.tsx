import { BatchItemStatus } from "../../shared/enums/batch-item-status.enum";
import type { BatchItem } from "../../shared/types/batch.types";

interface GalleryThumbProps {
  item: BatchItem;
  active: boolean;
  index: number;
  onSelect: () => void;
}

export function GalleryThumb({ item, active, index, onSelect }: GalleryThumbProps) {
  const done = item.status === BatchItemStatus.Succeeded;
  const src = item.resultObjectUrl || item.objectUrl;

  return (
    <button
      type="button"
      className={`gallery-thumb ${active ? "is-active" : ""}`}
      onClick={onSelect}
      title={item.fileName}
    >
      {src ? (
        <img src={src} alt={item.fileName} />
      ) : (
        <div className="gallery-thumb__empty">{index + 1}</div>
      )}
      {done && <span className="gallery-thumb__badge">已消除</span>}
    </button>
  );
}
