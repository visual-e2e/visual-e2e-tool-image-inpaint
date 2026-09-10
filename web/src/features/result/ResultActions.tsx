import { buildResultFileName, downloadObjectUrl } from "./download-image";

interface ResultActionsProps {
  sourceName: string;
  resultUrl?: string;
}

export function ResultActions({ sourceName, resultUrl }: ResultActionsProps) {
  if (!resultUrl) return null;

  return (
    <div className="result-actions">
      <button
        type="button"
        className="btn-primary"
        onClick={() => downloadObjectUrl(resultUrl, buildResultFileName(sourceName))}
      >
        下载结果
      </button>
    </div>
  );
}
