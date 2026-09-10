import { httpJson } from "./http-client";
import type { CacheLoadResult, PersistedSession } from "../types/cache.types";

export interface CacheSaveRequest {
  cacheRoot: string;
  session: PersistedSession;
  files?: Array<{
    relativePath: string;
    base64: string;
  }>;
}

export interface CacheSaveResponse {
  ok: boolean;
  cacheRoot: string;
  missingPaths: string[];
}

export interface CacheFileResponse {
  ok: boolean;
  base64?: string;
  missing?: boolean;
  path?: string;
}

export function saveCache(body: CacheSaveRequest): Promise<CacheSaveResponse> {
  return httpJson<CacheSaveResponse>("/api/cache/save", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loadCache(cacheRoot: string): Promise<CacheLoadResult> {
  return httpJson<CacheLoadResult>("/api/cache/load", {
    method: "POST",
    body: JSON.stringify({ cacheRoot }),
  });
}

export function readCacheFile(
  cacheRoot: string,
  relativePath: string,
): Promise<CacheFileResponse> {
  return httpJson<CacheFileResponse>("/api/cache/file", {
    method: "POST",
    body: JSON.stringify({ cacheRoot, relativePath }),
  });
}

export interface FolderListResponse {
  folder: string;
  files: Array<{
    name: string;
    path: string;
    base64: string;
    mime: string;
  }>;
}

export function listFolderImages(folder: string): Promise<FolderListResponse> {
  return httpJson<FolderListResponse>("/api/folder/list-images", {
    method: "POST",
    body: JSON.stringify({ folder }),
  });
}
