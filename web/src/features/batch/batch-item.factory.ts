import { BatchItemMaskState } from "../../shared/enums/batch-item-mask-state.enum";
import { BatchItemStatus } from "../../shared/enums/batch-item-status.enum";
import { UploadSourceType } from "../../shared/enums/upload-source-type.enum";
import type { BatchItem } from "../../shared/types/batch.types";
import { loadImageMeta } from "../upload/image-validators";

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createBatchItemFromFile(
  file: File,
  sourceType: UploadSourceType,
): Promise<BatchItem> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const meta = await loadImageMeta(objectUrl);
    return {
      id: createId(),
      fileName: file.name,
      sourceType,
      objectUrl,
      width: meta.width,
      height: meta.height,
      status: BatchItemStatus.Pending,
      maskState: BatchItemMaskState.None,
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export async function createBatchItemFromBase64(
  fileName: string,
  base64: string,
  mime: string,
  sourceType: UploadSourceType,
  cacheSourcePath?: string,
): Promise<BatchItem> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const file = new File([bytes], fileName, { type: mime });
  const item = await createBatchItemFromFile(file, sourceType);
  if (cacheSourcePath) item.cacheSourcePath = cacheSourcePath;
  return item;
}
