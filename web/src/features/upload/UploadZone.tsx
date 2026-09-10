import { InboxOutlined } from "@ant-design/icons";
import { Alert, Typography, Upload } from "antd";
import { useRef, useState } from "react";
import { ArchiveExtractStatus } from "../../shared/enums/archive-extract-status.enum";
import { UploadSourceType } from "../../shared/enums/upload-source-type.enum";
import { extractImagesFromZip } from "./archive-filters";
import {
  collectFilesFromDataTransfer,
  filterFolderImages,
  partitionUploads,
} from "./folder-walk";
import { assertImageFile } from "./image-validators";

interface UploadZoneProps {
  disabled?: boolean;
  onFiles: (files: File[], sourceType: UploadSourceType) => Promise<void> | void;
}

export function UploadZone({ disabled, onFiles }: UploadZoneProps) {
  const [extractStatus, setExtractStatus] = useState<ArchiveExtractStatus>(
    ArchiveExtractStatus.Idle,
  );
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<File[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropHandlingRef = useRef(false);

  async function handleIncoming(
    fileList: FileList | File[],
    options?: { fromDirectory?: boolean; imagesOnly?: boolean },
  ) {
    setError(null);
    setStatusText(null);
    const raw = Array.from(fileList);
    if (!raw.length) return;

    try {
      const fromDirectory =
        options?.fromDirectory
        || raw.some((f) => !!(f as File & { webkitRelativePath?: string }).webkitRelativePath);

      if (fromDirectory) {
        setStatusText("正在扫描文件夹…");
        const images = filterFolderImages(raw);
        if (!images.length) {
          throw new Error("文件夹中没有找到 JPG / PNG / WEBP 图片");
        }
        for (const file of images) assertImageFile(file);
        setStatusText(null);
        await onFiles(images, UploadSourceType.Folder);
        return;
      }

      if (options?.imagesOnly) {
        for (const file of raw) assertImageFile(file);
        await onFiles(raw, UploadSourceType.Files);
        return;
      }

      const { images, zips, others } = partitionUploads(raw);

      if (zips.length && images.length) {
        throw new Error("请分别上传图片或压缩包，不要混选");
      }
      if (others.length && !images.length && !zips.length) {
        throw new Error("仅支持 JPG / PNG / WEBP 图片、ZIP 或文件夹");
      }

      if (zips.length) {
        setExtractStatus(ArchiveExtractStatus.Reading);
        const all: File[] = [];
        for (const zip of zips) {
          setExtractStatus(ArchiveExtractStatus.Extracting);
          setStatusText(`正在解压 ${zip.name}…`);
          const extracted = await extractImagesFromZip(zip);
          all.push(...extracted);
        }
        setExtractStatus(ArchiveExtractStatus.Ready);
        setStatusText(null);
        await onFiles(all, UploadSourceType.ZipArchive);
        return;
      }

      for (const file of images) assertImageFile(file);
      await onFiles(images, UploadSourceType.Files);
    } catch (err) {
      setExtractStatus(ArchiveExtractStatus.Failed);
      setStatusText(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function queueFile(file: File) {
    if (dropHandlingRef.current) return;
    pendingRef.current.push(file);
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      const batch = pendingRef.current;
      pendingRef.current = [];
      void handleIncoming(batch, { imagesOnly: true });
    }, 0);
  }

  return (
    <div className="upload-zone">
      <Upload.Dragger
        multiple
        disabled={disabled}
        showUploadList={false}
        openFileDialogOnClick
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        beforeUpload={(file) => {
          queueFile(file as File);
          return Upload.LIST_IGNORE;
        }}
        onDrop={(e) => {
          if (disabled) return;
          dropHandlingRef.current = true;
          pendingRef.current = [];
          if (flushTimer.current) clearTimeout(flushTimer.current);

          void (async () => {
            try {
              setStatusText("正在读取拖入内容…");
              const { files, fromDirectory } = await collectFilesFromDataTransfer(
                e.dataTransfer,
              );
              await handleIncoming(files, { fromDirectory });
            } catch (err) {
              setStatusText(null);
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              dropHandlingRef.current = false;
            }
          })();
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <Typography.Title level={5}>支持 JPG / PNG / WEBP</Typography.Title>
        <Typography.Paragraph type="secondary">
          可拖放文件或文件夹，将自动遍历符合的图片
        </Typography.Paragraph>
      </Upload.Dragger>

      {(statusText || extractStatus === ArchiveExtractStatus.Extracting) && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          {statusText ?? "正在解压压缩包…"}
        </Typography.Paragraph>
      )}
      {error && (
        <Alert style={{ marginTop: 12 }} type="error" showIcon message={error} />
      )}
    </div>
  );
}
