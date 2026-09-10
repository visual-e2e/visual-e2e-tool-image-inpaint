import type { CacheStatus } from "../enums/cache-status.enum";
import type { BatchSession } from "./batch.types";

export interface CachePaths {
  storage?: string;
  tools?: string;
  cacheRoot: string;
  sessionFile: string;
}

export interface PersistedBatchItem {
  id: string;
  fileName: string;
  sourceType: string;
  width: number;
  height: number;
  status: string;
  maskState: string;
  relativeSourcePath?: string;
  relativeMaskPath?: string;
  relativeResultPath?: string;
  errorMessage?: string;
}

export interface PersistedSession {
  version: number;
  updatedAt: number;
  cacheRoot: string;
  dataDirTools?: string;
  session: {
    activeItemId: string | null;
    referenceItemId: string | null;
    maskApplyMode: string;
    reuseStrategy: string;
    reusableMask: BatchSession["reusableMask"];
    items: PersistedBatchItem[];
  };
}

export interface CacheLoadResult {
  status: CacheStatus;
  session?: PersistedSession;
  missingPaths: string[];
  message?: string;
}
