import { BatchItemMaskState } from "../../shared/enums/batch-item-mask-state.enum";
import { BatchItemStatus } from "../../shared/enums/batch-item-status.enum";
import type { BatchItem } from "../../shared/types/batch.types";

interface BatchQueueProps {
  items: BatchItem[];
  activeItemId: string | null;
  referenceItemId: string | null;
  onSelect: (id: string) => void;
  onSetReference: (id: string) => void;
  onRemove: (id: string) => void;
}

function statusLabel(status: BatchItemStatus): string {
  switch (status) {
    case BatchItemStatus.Pending:
      return "待处理";
    case BatchItemStatus.MaskReady:
      return "选区就绪";
    case BatchItemStatus.Processing:
      return "处理中";
    case BatchItemStatus.Succeeded:
      return "完成";
    case BatchItemStatus.Failed:
      return "失败";
    case BatchItemStatus.CacheMissing:
      return "缓存丢失";
    default:
      return status;
  }
}

export function BatchQueue(props: BatchQueueProps) {
  const {
    items,
    activeItemId,
    referenceItemId,
    onSelect,
    onSetReference,
    onRemove,
  } = props;

  if (!items.length) return null;

  return (
    <aside className="batch-queue">
      <div className="batch-queue__title">批量队列 ({items.length})</div>
      <ul className="batch-queue__list">
        {items.map((item) => {
          const active = item.id === activeItemId;
          const isRef = item.id === referenceItemId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`batch-item ${active ? "is-active" : ""}`}
                onClick={() => onSelect(item.id)}
              >
                <img src={item.resultObjectUrl ?? item.objectUrl} alt={item.fileName} />
                <div className="batch-item__meta">
                  <span className="batch-item__name" title={item.fileName}>
                    {isRef ? "★ " : ""}
                    {item.fileName}
                  </span>
                  <span className="batch-item__status">
                    {statusLabel(item.status)}
                    {item.maskState === BatchItemMaskState.Customized ? " · 已改选区" : ""}
                    {item.maskState === BatchItemMaskState.Inherited ? " · 继承选区" : ""}
                  </span>
                </div>
              </button>
              <div className="batch-item__actions">
                <button type="button" onClick={() => onSetReference(item.id)}>
                  设为基准
                </button>
                <button type="button" onClick={() => onRemove(item.id)}>
                  移除
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
