import { buildResultFileName, downloadObjectUrl } from "./download-image";

interface ResultActionsProps {
  sourceName: string;
  resultUrl?: string;
  onSaveCache?: () => void;
  savingCache?: boolean;
}

export function ResultActions({
  sourceName,
  resultUrl,
  onSaveCache,
  savingCache,
}: ResultActionsProps) {
  if (!resultUrl && !onSaveCache) return null;

  return (
    <div className="result-actions">
      {resultUrl && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => downloadObjectUrl(resultUrl, buildResultFileName(sourceName))}
        >
          下载结果
        </button>
      )}
      {onSaveCache && (
        <button type="button" disabled={savingCache} onClick={onSaveCache}>
          {savingCache ? "缓存中…" : "保存到 RPC 缓存"}
        </button>
      )}
    </div>
  );
}
