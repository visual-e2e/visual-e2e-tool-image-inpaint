import type { BatchItemMaskState } from "../enums/batch-item-mask-state.enum";
import type { BatchItemStatus } from "../enums/batch-item-status.enum";
import type { MaskApplyMode } from "../enums/mask-apply-mode.enum";
import type { MaskReuseStrategy } from "../enums/mask-reuse-strategy.enum";
import type { UploadSourceType } from "../enums/upload-source-type.enum";
import type { ReusableMask } from "./mask.types";

export interface BatchItem {
  id: string;
  fileName: string;
  sourceType: UploadSourceType;
  objectUrl: string;
  width: number;
  height: number;
  status: BatchItemStatus;
  maskState: BatchItemMaskState;
  localMaskDataUrl?: string;
  resultObjectUrl?: string;
  cacheSourcePath?: string;
  cacheMaskPath?: string;
  cacheResultPath?: string;
  errorMessage?: string;
}

export interface BatchSession {
  items: BatchItem[];
  activeItemId: string | null;
  referenceItemId: string | null;
  maskApplyMode: MaskApplyMode;
  reusableMask: ReusableMask | null;
  reuseStrategy: MaskReuseStrategy;
}
