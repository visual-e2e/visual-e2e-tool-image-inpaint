import { useCallback, useMemo, useRef, useState } from "react";
import { BATCH_CONCURRENCY } from "../../shared/constants/upload.constants";
import { BatchItemMaskState } from "../../shared/enums/batch-item-mask-state.enum";
import { BatchItemStatus } from "../../shared/enums/batch-item-status.enum";
import { ExportQuality } from "../../shared/enums/export-quality.enum";
import { JobStatus } from "../../shared/enums/job-status.enum";
import { MaskApplyMode } from "../../shared/enums/mask-apply-mode.enum";
import { MaskReuseStrategy } from "../../shared/enums/mask-reuse-strategy.enum";
import { ProcessMode } from "../../shared/enums/process-mode.enum";
import { UploadSourceType } from "../../shared/enums/upload-source-type.enum";
import { runInpaint } from "../../shared/api/inpaint.api";
import { revokeObjectUrl } from "../../shared/hooks/useObjectUrl";
import type { BatchItem, BatchSession } from "../../shared/types/batch.types";
import type { ReusableMask } from "../../shared/types/mask.types";
import {
  canvasToMaskDataUrl,
  createEmptyReusableMask,
  hasMaskContent,
  renderReusableMask,
} from "../mask-reuse/mask-mapper";
import { createBatchItemFromFile } from "./batch-item.factory";
import {
  base64ToObjectUrl,
  dataUrlToBase64,
  fileToDataUrl,
} from "../upload/image-validators";

function createSession(): BatchSession {
  return {
    items: [],
    activeItemId: null,
    referenceItemId: null,
    maskApplyMode: MaskApplyMode.PerImage,
    reusableMask: null,
    reuseStrategy: MaskReuseStrategy.Proportional,
  };
}

async function blobUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return fileToDataUrl(blob);
}

export function useBatchSession() {
  const [session, setSession] = useState<BatchSession>(createSession);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [running, setRunning] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus>(JobStatus.Idle);
  const [error, setError] = useState<string | null>(null);

  const activeItem = useMemo(
    () => session.items.find((i) => i.id === session.activeItemId) ?? null,
    [session],
  );

  const replaceItems = useCallback((updater: (items: BatchItem[]) => BatchItem[]) => {
    setSession((prev) => {
      const items = updater(prev.items);
      const activeItemId =
        items.find((i) => i.id === prev.activeItemId)?.id ?? items[0]?.id ?? null;
      const referenceItemId =
        items.find((i) => i.id === prev.referenceItemId)?.id
        ?? items[0]?.id
        ?? null;
      return { ...prev, items, activeItemId, referenceItemId };
    });
  }, []);

  const addFiles = useCallback(async (files: File[], sourceType: UploadSourceType) => {
    const created: BatchItem[] = [];
    for (const file of files) {
      created.push(await createBatchItemFromFile(file, sourceType));
    }
    setSession((prev) => {
      const items = [...prev.items, ...created];
      return {
        ...prev,
        items,
        activeItemId: prev.activeItemId ?? created[0]?.id ?? null,
        referenceItemId: prev.referenceItemId ?? created[0]?.id ?? null,
      };
    });
  }, []);

  const selectItem = useCallback((id: string) => {
    setSession((prev) => ({ ...prev, activeItemId: id }));
  }, []);

  const setReference = useCallback((id: string) => {
    setSession((prev) => ({ ...prev, referenceItemId: id }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setSession((prev) => {
      const target = prev.items.find((i) => i.id === id);
      if (target) {
        revokeObjectUrl(target.objectUrl);
        revokeObjectUrl(target.resultObjectUrl);
      }
      const items = prev.items.filter((i) => i.id !== id);
      return {
        ...prev,
        items,
        activeItemId:
          prev.activeItemId === id ? items[0]?.id ?? null : prev.activeItemId,
        referenceItemId:
          prev.referenceItemId === id ? items[0]?.id ?? null : prev.referenceItemId,
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    setSession((prev) => {
      for (const item of prev.items) {
        revokeObjectUrl(item.objectUrl);
        revokeObjectUrl(item.resultObjectUrl);
      }
      return createSession();
    });
    setError(null);
    setJobStatus(JobStatus.Idle);
  }, []);

  const setMaskApplyMode = useCallback((mode: MaskApplyMode) => {
    setSession((prev) => ({ ...prev, maskApplyMode: mode }));
  }, []);

  const setReusableMask = useCallback((mask: ReusableMask | null) => {
    setSession((prev) => ({ ...prev, reusableMask: mask }));
  }, []);

  const appendStrokeToReusable = useCallback(
    (itemId: string, stroke: ReusableMask["strokes"][number]) => {
      setSession((prev) => {
        const base =
          prev.reusableMask && prev.reusableMask.sourceBatchItemId === itemId
            ? prev.reusableMask
            : createEmptyReusableMask(itemId);
        const reusableMask = {
          ...base,
          strokes: [...base.strokes, stroke],
          sourceBatchItemId: itemId,
          updatedAt: Date.now(),
        };
        const items = prev.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            maskState: BatchItemMaskState.Customized,
            status:
              item.status === BatchItemStatus.Succeeded
                ? item.status
                : BatchItemStatus.MaskReady,
            localMaskDataUrl: canvasToMaskDataUrl(
              renderReusableMask(reusableMask, item.width, item.height),
            ),
          };
        });
        return {
          ...prev,
          reusableMask,
          referenceItemId: itemId,
          items,
        };
      });
    },
    [],
  );

  const appendRectToReusable = useCallback(
    (itemId: string, rect: NonNullable<ReusableMask["rects"]>[number]) => {
      setSession((prev) => {
        const base =
          prev.reusableMask && prev.reusableMask.sourceBatchItemId === itemId
            ? prev.reusableMask
            : createEmptyReusableMask(itemId);
        const reusableMask = {
          ...base,
          rects: [...base.rects, rect],
          sourceBatchItemId: itemId,
          updatedAt: Date.now(),
        };
        const items = prev.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            maskState: BatchItemMaskState.Customized,
            status:
              item.status === BatchItemStatus.Succeeded
                ? item.status
                : BatchItemStatus.MaskReady,
            localMaskDataUrl: canvasToMaskDataUrl(
              renderReusableMask(reusableMask, item.width, item.height),
            ),
          };
        });
        return {
          ...prev,
          reusableMask,
          referenceItemId: itemId,
          items,
        };
      });
    },
    [],
  );

  const clearMask = useCallback((itemId: string) => {
    setSession((prev) => ({
      ...prev,
      reusableMask:
        prev.reusableMask?.sourceBatchItemId === itemId ? null : prev.reusableMask,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              localMaskDataUrl: undefined,
              maskState: BatchItemMaskState.None,
              status:
                item.status === BatchItemStatus.Succeeded
                  ? item.status
                  : BatchItemStatus.Pending,
            }
          : item,
      ),
    }));
  }, []);

  const applyMaskToAll = useCallback(() => {
    setSession((prev) => {
      if (!hasMaskContent(prev.reusableMask)) {
        setError("请先在基准图上绘制选区");
        return prev;
      }
      const reusable = prev.reusableMask!;
      const items = prev.items.map((item) => {
        if (
          item.maskState === BatchItemMaskState.Customized
          && item.id !== reusable.sourceBatchItemId
        ) {
          return item;
        }
        const maskUrl = canvasToMaskDataUrl(
          renderReusableMask(reusable, item.width, item.height),
        );
        return {
          ...item,
          localMaskDataUrl: maskUrl,
          maskState:
            item.id === reusable.sourceBatchItemId
              ? BatchItemMaskState.Customized
              : BatchItemMaskState.Inherited,
          status: BatchItemStatus.MaskReady,
        };
      });
      return {
        ...prev,
        maskApplyMode: MaskApplyMode.ReuseSelection,
        items,
      };
    });
  }, []);

  const resolveMaskForItem = useCallback(
    (item: BatchItem, mode: ProcessMode, reusable: ReusableMask | null) => {
      if (mode === ProcessMode.Auto) return undefined;
      if (item.localMaskDataUrl) return item.localMaskDataUrl;
      if (reusable && hasMaskContent(reusable)) {
        return canvasToMaskDataUrl(
          renderReusableMask(reusable, item.width, item.height),
        );
      }
      return undefined;
    },
    [],
  );

  const processOne = useCallback(
    async (itemId: string, mode: ProcessMode) => {
      const latest = sessionRef.current.items.find((i) => i.id === itemId);
      if (!latest) throw new Error("图片不存在");
      if (!latest.objectUrl) throw new Error(`「${latest.fileName}」源图不可用（缓存可能已丢失）`);

      const maskDataUrl = resolveMaskForItem(
        latest,
        mode,
        sessionRef.current.reusableMask,
      );
      if (mode === ProcessMode.ManualBrush && !maskDataUrl) {
        throw new Error(`「${latest.fileName}」缺少选区`);
      }

      const imageDataUrl = await blobUrlToDataUrl(latest.objectUrl);
      const response = await runInpaint({
        mode,
        imageBase64: dataUrlToBase64(imageDataUrl),
        maskBase64: maskDataUrl ? dataUrlToBase64(maskDataUrl) : undefined,
        exportQuality: ExportQuality.Original,
      });

      if (response.status !== JobStatus.Succeeded || !response.resultBase64) {
        throw new Error(response.message ?? "去水印失败");
      }
      if (response.width !== latest.width || response.height !== latest.height) {
        throw new Error(
          `结果尺寸 ${response.width}x${response.height} 与原图 ${latest.width}x${latest.height} 不一致`,
        );
      }

      return base64ToObjectUrl(response.resultBase64);
    },
    [resolveMaskForItem],
  );

  const runActive = useCallback(
    async (mode: ProcessMode) => {
      if (!activeItem) return;
      setRunning(true);
      setError(null);
      setJobStatus(JobStatus.Inpainting);
      replaceItems((items) =>
        items.map((i) =>
          i.id === activeItem.id
            ? { ...i, status: BatchItemStatus.Processing, errorMessage: undefined }
            : i,
        ),
      );
      try {
        const resultUrl = await processOne(activeItem.id, mode);
        replaceItems((items) =>
          items.map((i) => {
            if (i.id !== activeItem.id) return i;
            revokeObjectUrl(i.resultObjectUrl);
            return {
              ...i,
              status: BatchItemStatus.Succeeded,
              resultObjectUrl: resultUrl,
            };
          }),
        );
        setJobStatus(JobStatus.Succeeded);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setJobStatus(JobStatus.Failed);
        replaceItems((items) =>
          items.map((i) =>
            i.id === activeItem.id
              ? { ...i, status: BatchItemStatus.Failed, errorMessage: message }
              : i,
          ),
        );
      } finally {
        setRunning(false);
      }
    },
    [activeItem, processOne, replaceItems],
  );

  const runBatch = useCallback(
    async (mode: ProcessMode) => {
      setRunning(true);
      setError(null);
      setJobStatus(JobStatus.Inpainting);
      const queue = [...session.items];
      let cursor = 0;

      const worker = async () => {
        while (cursor < queue.length) {
          const index = cursor;
          cursor += 1;
          const item = queue[index];
          replaceItems((items) =>
            items.map((i) =>
              i.id === item.id
                ? { ...i, status: BatchItemStatus.Processing, errorMessage: undefined }
                : i,
            ),
          );
          try {
            const resultUrl = await processOne(item.id, mode);
            replaceItems((items) =>
              items.map((i) => {
                if (i.id !== item.id) return i;
                revokeObjectUrl(i.resultObjectUrl);
                return {
                  ...i,
                  status: BatchItemStatus.Succeeded,
                  resultObjectUrl: resultUrl,
                };
              }),
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            replaceItems((items) =>
              items.map((i) =>
                i.id === item.id
                  ? { ...i, status: BatchItemStatus.Failed, errorMessage: message }
                  : i,
              ),
            );
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(BATCH_CONCURRENCY, queue.length) }, () =>
          worker(),
        ),
      );
      setJobStatus(JobStatus.Succeeded);
      setRunning(false);
    },
    [processOne, replaceItems, session.items],
  );

  const hydrateSession = useCallback((next: BatchSession) => {
    setSession(next);
  }, []);

  return {
    session,
    activeItem,
    running,
    jobStatus,
    error,
    setError,
    addFiles,
    selectItem,
    setReference,
    removeItem,
    clearAll,
    setMaskApplyMode,
    setReusableMask,
    appendStrokeToReusable,
    appendRectToReusable,
    clearMask,
    applyMaskToAll,
    runActive,
    runBatch,
    hydrateSession,
    setSession,
  };
}
