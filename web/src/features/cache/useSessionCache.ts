import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadCache,
  readCacheFile,
  saveCache,
} from "../../shared/api/cache.api";
import { CACHE_VERSION } from "../../shared/constants/upload.constants";
import { BatchItemMaskState } from "../../shared/enums/batch-item-mask-state.enum";
import { BatchItemStatus } from "../../shared/enums/batch-item-status.enum";
import { CacheStatus } from "../../shared/enums/cache-status.enum";
import { MaskApplyMode } from "../../shared/enums/mask-apply-mode.enum";
import { MaskReuseStrategy } from "../../shared/enums/mask-reuse-strategy.enum";
import { UploadSourceType } from "../../shared/enums/upload-source-type.enum";
import {
  resolveCachePaths,
  subscribeCacheClear,
} from "../../shared/rpc/host-fs";
import type { BatchItem, BatchSession } from "../../shared/types/batch.types";
import type { CachePaths, PersistedSession } from "../../shared/types/cache.types";
import { createBatchItemFromBase64 } from "../batch/batch-item.factory";
import {
  dataUrlToBase64,
  fileToDataUrl,
} from "../upload/image-validators";

const AUTO_SAVE_MS = 900;

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  const dataUrl = await fileToDataUrl(blob);
  return dataUrlToBase64(dataUrl);
}

export function useSessionCache(
  session: BatchSession,
  hydrateSession: (session: BatchSession) => void,
) {
  const [paths, setPaths] = useState<CachePaths | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>(CacheStatus.Unknown);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bootstrappedRef = useRef(false);
  const restoringRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const next = await resolveCachePaths();
      setPaths(next);
    })();
  }, []);

  useEffect(() => {
    return subscribeCacheClear(() => {
      setCacheStatus(CacheStatus.Cleared);
      setCacheMessage("检测到 Host 缓存清理通知，本地缓存可能已失效，请重新上传。");
    });
  }, []);

  const persist = useCallback(async (options?: { silent?: boolean }) => {
    if (!paths) return;
    if (session.items.length === 0) return;
    const silent = options?.silent ?? true;
    setSaving(true);
    if (!silent) setCacheMessage(null);
    try {
      const files: Array<{ relativePath: string; base64: string }> = [];
      const persistedItems = [];

      for (const item of session.items) {
        if (!item.objectUrl) continue;
        const sourceRel = `sources/${item.id}-${item.fileName}`;
        const sourceBase64 = await urlToBase64(item.objectUrl);
        files.push({ relativePath: sourceRel, base64: sourceBase64 });

        let maskRel: string | undefined;
        if (item.localMaskDataUrl) {
          maskRel = `masks/${item.id}.png`;
          files.push({
            relativePath: maskRel,
            base64: dataUrlToBase64(item.localMaskDataUrl),
          });
        }

        let resultRel: string | undefined;
        if (item.resultObjectUrl) {
          resultRel = `results/${item.id}-${item.fileName}`;
          files.push({
            relativePath: resultRel,
            base64: await urlToBase64(item.resultObjectUrl),
          });
        }

        persistedItems.push({
          id: item.id,
          fileName: item.fileName,
          sourceType: item.sourceType,
          width: item.width,
          height: item.height,
          status: item.status,
          maskState: item.maskState,
          relativeSourcePath: sourceRel,
          relativeMaskPath: maskRel,
          relativeResultPath: resultRel,
          errorMessage: item.errorMessage,
        });
      }

      if (persistedItems.length === 0) return;

      const payload: PersistedSession = {
        version: CACHE_VERSION,
        updatedAt: Date.now(),
        cacheRoot: paths.cacheRoot,
        dataDirTools: paths.tools,
        session: {
          activeItemId: session.activeItemId,
          referenceItemId: session.referenceItemId,
          maskApplyMode: session.maskApplyMode,
          reuseStrategy: session.reuseStrategy,
          reusableMask: session.reusableMask,
          items: persistedItems,
        },
      };

      const result = await saveCache({
        cacheRoot: paths.cacheRoot,
        session: payload,
        files,
      });

      if (result.missingPaths.length) {
        setCacheStatus(CacheStatus.Missing);
        setCacheMessage(`部分缓存写入失败：${result.missingPaths.join(", ")}`);
      } else {
        setCacheStatus(CacheStatus.Ready);
      }
    } catch (err) {
      setCacheStatus(CacheStatus.Error);
      setCacheMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [paths, session]);

  const restore = useCallback(async () => {
    if (!paths) return;
    restoringRef.current = true;
    setCacheMessage(null);
    try {
      const loaded = await loadCache(paths.cacheRoot);
      if (loaded.status === CacheStatus.Missing || !loaded.session) {
        setCacheStatus(CacheStatus.Missing);
        return;
      }

      if (loaded.missingPaths.length) {
        setCacheStatus(CacheStatus.Missing);
        setCacheMessage(
          `缓存文件缺失：${loaded.missingPaths.slice(0, 5).join(", ")}${
            loaded.missingPaths.length > 5 ? "…" : ""
          }。请重新上传缺失图片。`,
        );
      } else {
        setCacheStatus(CacheStatus.Ready);
      }

      const items: BatchItem[] = [];
      for (const raw of loaded.session.session.items) {
        if (!raw.relativeSourcePath) {
          items.push({
            id: raw.id,
            fileName: raw.fileName,
            sourceType: (raw.sourceType as UploadSourceType) || UploadSourceType.Files,
            objectUrl: "",
            width: raw.width,
            height: raw.height,
            status: BatchItemStatus.CacheMissing,
            maskState: BatchItemMaskState.None,
            errorMessage: "源图缓存缺失",
          });
          continue;
        }

        const file = await readCacheFile(paths.cacheRoot, raw.relativeSourcePath);
        if (!file.ok || !file.base64) {
          items.push({
            id: raw.id,
            fileName: raw.fileName,
            sourceType: (raw.sourceType as UploadSourceType) || UploadSourceType.Files,
            objectUrl: "",
            width: raw.width,
            height: raw.height,
            status: BatchItemStatus.CacheMissing,
            maskState: BatchItemMaskState.None,
            cacheSourcePath: raw.relativeSourcePath,
            errorMessage: "源图缓存文件不存在",
          });
          continue;
        }

        const mime = raw.fileName.toLowerCase().endsWith(".png")
          ? "image/png"
          : "image/jpeg";
        const item = await createBatchItemFromBase64(
          raw.fileName,
          file.base64,
          mime,
          (raw.sourceType as UploadSourceType) || UploadSourceType.Files,
          raw.relativeSourcePath,
        );
        item.id = raw.id;
        item.width = raw.width;
        item.height = raw.height;
        item.status = loaded.missingPaths.includes(raw.relativeSourcePath)
          ? BatchItemStatus.CacheMissing
          : (raw.status as BatchItemStatus);
        item.maskState = raw.maskState as BatchItemMaskState;

        if (raw.relativeMaskPath) {
          const mask = await readCacheFile(paths.cacheRoot, raw.relativeMaskPath);
          if (mask.ok && mask.base64) {
            item.localMaskDataUrl = `data:image/png;base64,${mask.base64}`;
            item.cacheMaskPath = raw.relativeMaskPath;
          } else {
            item.status = BatchItemStatus.CacheMissing;
            item.errorMessage = "选区缓存文件缺失，请重新绘制";
          }
        }

        if (raw.relativeResultPath) {
          const result = await readCacheFile(paths.cacheRoot, raw.relativeResultPath);
          if (result.ok && result.base64) {
            const binary = atob(result.base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            item.resultObjectUrl = URL.createObjectURL(
              new Blob([bytes], { type: mime }),
            );
            item.cacheResultPath = raw.relativeResultPath;
          }
        }

        items.push(item);
      }

      const next: BatchSession = {
        items,
        activeItemId: loaded.session.session.activeItemId,
        referenceItemId: loaded.session.session.referenceItemId,
        maskApplyMode: loaded.session.session.maskApplyMode as MaskApplyMode,
        reuseStrategy: loaded.session.session.reuseStrategy as MaskReuseStrategy,
        reusableMask: loaded.session.session.reusableMask,
      };
      hydrateSession(next);
    } catch (err) {
      setCacheStatus(CacheStatus.Error);
      setCacheMessage(err instanceof Error ? err.message : String(err));
    } finally {
      restoringRef.current = false;
      bootstrappedRef.current = true;
    }
  }, [hydrateSession, paths]);

  useEffect(() => {
    if (!paths || bootstrappedRef.current) return;
    void restore();
  }, [paths, restore]);

  useEffect(() => {
    if (!bootstrappedRef.current || restoringRef.current || !paths) return;
    if (session.items.length === 0) return;
    const timer = window.setTimeout(() => {
      void persist({ silent: true });
    }, AUTO_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [session, paths, persist]);

  return {
    paths,
    cacheStatus,
    cacheMessage,
    saving,
    persist,
    restore,
    dismissCacheMessage: () => setCacheMessage(null),
  };
}
