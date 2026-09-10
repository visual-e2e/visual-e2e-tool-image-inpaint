import { useEffect, useRef, useState } from "react";
import { Alert } from "antd";
import { isEmbedded } from "@visual-e2e/rpc-sdk";
import { BatchItemMaskState } from "../shared/enums/batch-item-mask-state.enum";
import { BatchItemStatus } from "../shared/enums/batch-item-status.enum";
import { CacheStatus } from "../shared/enums/cache-status.enum";
import { ProcessMode } from "../shared/enums/process-mode.enum";
import { SelectionTool } from "../shared/enums/selection-tool.enum";
import { UploadSourceType } from "../shared/enums/upload-source-type.enum";
import { useBatchSession } from "../features/batch/useBatchSession";
import { useSessionCache } from "../features/cache/useSessionCache";
import { BrushCanvas } from "../features/editor/BrushCanvas";
import { CompareSlider } from "../features/editor/CompareSlider";
import { ImageCanvas } from "../features/editor/ImageCanvas";
import { RectSelectOverlay } from "../features/editor/RectSelectOverlay";
import { useBrushCanvas } from "../features/editor/useBrushCanvas";
import { useRectSelect } from "../features/editor/useRectSelect";
import { GalleryRail } from "../features/gallery/GalleryRail";
import { EditorHeader } from "../features/header/EditorHeader";
import { LeftPanel } from "../features/left-panel/LeftPanel";
import { CanvasFloatingBar } from "../features/canvas/CanvasFloatingBar";
import { CanvasStage } from "../features/canvas/CanvasStage";
import { useCanvasViewport } from "../features/canvas/useCanvasViewport";
import { useEditHistory } from "../features/canvas/useEditHistory";
import { downloadAllResults, buildResultFileName, downloadObjectUrl } from "../features/result/download-image";
import { UploadZone } from "../features/upload/UploadZone";
import { extractImagesFromZip } from "../features/upload/archive-filters";
import { filterFolderImages, partitionUploads } from "../features/upload/folder-walk";
import { assertImageFile } from "../features/upload/image-validators";
import { hasMaskContent, canvasToMaskDataUrl, renderReusableMask } from "../features/mask-reuse/mask-mapper";
import { EditorShell } from "../layouts/EditorShell";

export function WatermarkRemoverPage() {
  const embedded = isEmbedded();
  const [processMode, setProcessMode] = useState(ProcessMode.ManualBrush);
  const [selectionTool, setSelectionTool] = useState(SelectionTool.Rectangle);
  const [compareMode, setCompareMode] = useState(false);

  const batch = useBatchSession();
  const cache = useSessionCache(batch.session, batch.hydrateSession);
  const viewport = useCanvasViewport();
  const history = useEditHistory();
  const skipHistory = useRef(false);

  const active = batch.activeItem;
  const manualEnabled = processMode === ProcessMode.ManualBrush && !!active;
  const brushEnabled =
    manualEnabled && selectionTool === SelectionTool.Brush && !viewport.panMode;
  const rectEnabled =
    manualEnabled && selectionTool === SelectionTool.Rectangle && !viewport.panMode;

  const effectiveMode =
    processMode === ProcessMode.Auto || selectionTool === SelectionTool.AutoDetect
      ? ProcessMode.Auto
      : ProcessMode.ManualBrush;

  const canRemove =
    !!active
    && (effectiveMode === ProcessMode.Auto
      || !!active.localMaskDataUrl
      || hasMaskContent(batch.session.reusableMask));

  const brush = useBrushCanvas({
    width: active?.width ?? 0,
    height: active?.height ?? 0,
    enabled: brushEnabled,
    onStrokeEnd: (stroke) => {
      if (!active) return;
      history.push(batch.session.reusableMask);
      batch.appendStrokeToReusable(active.id, stroke);
    },
  });

  const rectSelect = useRectSelect({
    width: active?.width ?? 0,
    height: active?.height ?? 0,
    enabled: rectEnabled,
    onRectEnd: (rect) => {
      if (!active) return;
      history.push(batch.session.reusableMask);
      batch.appendRectToReusable(active.id, rect);
    },
  });

  useEffect(() => {
    if (!active) return;
    if (batch.session.reusableMask) {
      const showInherited =
        active.id === batch.session.reusableMask.sourceBatchItemId
        || active.maskState === BatchItemMaskState.Inherited
        || active.maskState === BatchItemMaskState.Customized;
      brush.redrawFromMask(
        showInherited ? batch.session.reusableMask.strokes : [],
        showInherited ? batch.session.reusableMask.rects : [],
      );
    } else {
      brush.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, batch.session.reusableMask?.updatedAt, active?.maskState]);

  useEffect(() => {
    if (skipHistory.current) {
      skipHistory.current = false;
    }
  }, [batch.session.reusableMask]);

  const committedRects =
    batch.session.reusableMask
    && active
    && (active.id === batch.session.reusableMask.sourceBatchItemId
      || active.maskState === BatchItemMaskState.Inherited
      || active.maskState === BatchItemMaskState.Customized)
      ? batch.session.reusableMask.rects
      : [];

  async function ingestFiles(
    fileList: FileList | File[],
    options?: { fromDirectory?: boolean; zipOnly?: boolean; imagesOnly?: boolean },
  ) {
    const raw = Array.from(fileList);
    if (!raw.length) return;

    const fromDirectory =
      options?.fromDirectory
      || raw.some((f) => !!(f as File & { webkitRelativePath?: string }).webkitRelativePath);

    try {
      if (fromDirectory) {
        const images = filterFolderImages(raw);
        if (!images.length) {
          batch.setError("文件夹中没有找到 JPG / PNG / WEBP 图片");
          return;
        }
        for (const file of images) assertImageFile(file);
        await batch.addFiles(images, UploadSourceType.Folder);
        return;
      }

      if (options?.imagesOnly) {
        for (const file of raw) assertImageFile(file);
        await batch.addFiles(raw, UploadSourceType.Files);
        return;
      }

      if (options?.zipOnly) {
        const all: File[] = [];
        for (const zip of raw) {
          all.push(...(await extractImagesFromZip(zip)));
        }
        if (!all.length) {
          batch.setError("压缩包中没有找到可用图片");
          return;
        }
        await batch.addFiles(all, UploadSourceType.ZipArchive);
        return;
      }

      const { images, zips, others } = partitionUploads(raw);
      if (zips.length && images.length) {
        batch.setError("请分别上传图片或压缩包，不要混选");
        return;
      }
      if (others.length && !images.length && !zips.length) {
        batch.setError("仅支持 JPG / PNG / WEBP 图片、ZIP 或文件夹");
        return;
      }
      if (zips.length) {
        const all: File[] = [];
        for (const zip of zips) {
          all.push(...(await extractImagesFromZip(zip)));
        }
        await batch.addFiles(all, UploadSourceType.ZipArchive);
        return;
      }
      for (const file of images) assertImageFile(file);
      await batch.addFiles(images, UploadSourceType.Files);
    } catch (err) {
      batch.setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleClearMask() {
    if (!active) return;
    history.push(batch.session.reusableMask);
    brush.clear();
    batch.clearMask(active.id);
  }

  function handleUndo() {
    const prev = history.undo();
    if (prev === undefined || !active) return;
    skipHistory.current = true;
    if (!prev) {
      batch.clearMask(active.id);
      brush.clear();
      return;
    }
    const maskUrl = canvasToMaskDataUrl(
      renderReusableMask(prev, active.width, active.height),
    );
    batch.setSession((s) => ({
      ...s,
      reusableMask: prev,
      items: s.items.map((item) =>
        item.id === active.id
          ? {
              ...item,
              localMaskDataUrl: maskUrl,
              maskState: BatchItemMaskState.Customized,
              status:
                item.status === BatchItemStatus.Succeeded
                  ? item.status
                  : BatchItemStatus.MaskReady,
            }
          : item,
      ),
    }));
  }

  function handleRedo() {
    const next = history.redo();
    if (next === undefined || !active) return;
    skipHistory.current = true;
    if (!next) {
      batch.clearMask(active.id);
      brush.clear();
      return;
    }
    const maskUrl = canvasToMaskDataUrl(
      renderReusableMask(next, active.width, active.height),
    );
    batch.setSession((s) => ({
      ...s,
      reusableMask: next,
      items: s.items.map((item) =>
        item.id === active.id
          ? {
              ...item,
              localMaskDataUrl: maskUrl,
              maskState: BatchItemMaskState.Customized,
              status:
                item.status === BatchItemStatus.Succeeded
                  ? item.status
                  : BatchItemStatus.MaskReady,
            }
          : item,
      ),
    }));
  }

  const resultCount = batch.session.items.filter((i) => i.resultObjectUrl).length;

  return (
    <EditorShell
      header={
        <EditorHeader
          canDownloadAll={resultCount > 0}
          onDownloadAll={() => void downloadAllResults(batch.session.items)}
          onUpload={(files, options) => void ingestFiles(files, options)}
          uploadDisabled={batch.running}
          onRestoreCache={() => void cache.restore()}
          onSaveCache={() => void cache.persist()}
          savingCache={cache.saving}
          onApplyMaskToAll={batch.applyMaskToAll}
          canApplyMaskToAll={batch.session.items.length > 1 && hasMaskContent(batch.session.reusableMask)}
        />
      }
      banners={
        <div className="editor-banners">
          {!embedded && (
            <Alert
              type="warning"
              showIcon
              banner
              message="未嵌入 Host：RPC 缓存目录不可用，将使用本地缓存。"
            />
          )}
          {cache.cacheMessage && (
            <Alert
              type={
                cache.cacheStatus === CacheStatus.Missing
                || cache.cacheStatus === CacheStatus.Cleared
                  ? "warning"
                  : "info"
              }
              showIcon
              banner
              closable
              onClose={cache.dismissCacheMessage}
              message={cache.cacheMessage}
            />
          )}
          {batch.error && (
            <Alert
              type="error"
              showIcon
              banner
              closable
              onClose={() => batch.setError(null)}
              message={batch.error}
            />
          )}
          {active?.status === BatchItemStatus.CacheMissing && (
            <Alert
              type="warning"
              showIcon
              banner
              message={`缓存文件已丢失，请重新上传「${active.fileName}」。`}
            />
          )}
        </div>
      }
      left={
        <LeftPanel
          processMode={processMode}
          onProcessModeChange={(mode) => {
            setProcessMode(mode);
            viewport.setPanMode(false);
            if (mode === ProcessMode.Auto) {
              setSelectionTool(SelectionTool.AutoDetect);
            } else if (selectionTool === SelectionTool.AutoDetect) {
              setSelectionTool(SelectionTool.Rectangle);
            }
          }}
          selectionTool={selectionTool}
          onSelectionToolChange={(tool) => {
            setSelectionTool(tool);
            viewport.setPanMode(false);
          }}
          brushTool={brush.tool}
          onBrushToolChange={(tool) => {
            brush.setTool(tool);
            viewport.setPanMode(false);
          }}
          brushSize={brush.brushSize}
          onBrushSizeChange={brush.setBrushSize}
          onClearMask={() => {
            viewport.setPanMode(false);
            handleClearMask();
          }}
          canRemove={canRemove}
          running={batch.running}
          onRemove={() => void batch.runActive(effectiveMode)}
          onRemoveAll={() => void batch.runBatch(effectiveMode)}
          batchCount={batch.session.items.length}
        />
      }
      center={
        <CanvasStage
          scale={viewport.scale}
          offset={viewport.offset}
          panMode={viewport.panMode}
          onPan={viewport.setOffset}
          processing={batch.running}
          empty={
            !active ? (
              <div className="canvas-empty">
                <UploadZone
                  onFiles={async (files, sourceType) => {
                    await batch.addFiles(files, sourceType);
                  }}
                />
              </div>
            ) : undefined
          }
          floatingBar={
            <CanvasFloatingBar
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              scale={viewport.scale}
              onZoomIn={() => {
                viewport.setPanMode(false);
                viewport.zoomIn();
              }}
              onZoomOut={() => {
                viewport.setPanMode(false);
                viewport.zoomOut();
              }}
              onZoomChange={(value) => {
                viewport.setPanMode(false);
                viewport.setZoom(value);
              }}
              onFit={() => {
                viewport.setPanMode(false);
                viewport.fit();
              }}
              panMode={viewport.panMode}
              onTogglePan={() => viewport.setPanMode((v) => !v)}
              compareMode={compareMode}
              onToggleCompare={() => {
                viewport.setPanMode(false);
                setCompareMode((v) => !v);
              }}
              canCompare={!!active?.resultObjectUrl}
              canDownload={!!active?.resultObjectUrl}
              onDownload={() => {
                if (!active?.resultObjectUrl) return;
                downloadObjectUrl(
                  active.resultObjectUrl,
                  buildResultFileName(active.fileName),
                );
              }}
            />
          }
        >
          {active && active.objectUrl && (
            compareMode && active.resultObjectUrl ? (
              <CompareSlider beforeSrc={active.objectUrl} afterSrc={active.resultObjectUrl} />
            ) : (
              <ImageCanvas src={active.resultObjectUrl && !compareMode ? active.resultObjectUrl : active.objectUrl}>
                {!active.resultObjectUrl && (
                  <>
                    <BrushCanvas
                      canvasRef={brush.canvasRef}
                      width={active.width}
                      height={active.height}
                      enabled={brushEnabled}
                      onPointerDown={brush.onPointerDown}
                      onPointerMove={brush.onPointerMove}
                      onPointerUp={brush.onPointerUp}
                    />
                    <RectSelectOverlay
                      width={active.width}
                      height={active.height}
                      enabled={rectEnabled}
                      preview={rectSelect.preview}
                      committedRects={committedRects}
                      onPointerDown={rectSelect.onPointerDown}
                      onPointerMove={rectSelect.onPointerMove}
                      onPointerUp={rectSelect.onPointerUp}
                    />
                  </>
                )}
              </ImageCanvas>
            )
          )}
        </CanvasStage>
      }
      right={
        <GalleryRail
          items={batch.session.items}
          activeItemId={batch.session.activeItemId}
          onSelect={(id) => {
            batch.selectItem(id);
            setCompareMode(false);
            viewport.fit();
          }}
          onRemoveActive={() => {
            if (batch.session.activeItemId) {
              batch.removeItem(batch.session.activeItemId);
            }
          }}
          onAddImages={(files) => void ingestFiles(files, { imagesOnly: true })}
          disabled={batch.running}
        />
      }
    />
  );
}
