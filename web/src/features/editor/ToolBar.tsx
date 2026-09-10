import { BrushTool } from "../../shared/enums/brush-tool.enum";
import { BRUSH_DEFAULTS } from "../../shared/constants/upload.constants";
import { MaskApplyMode } from "../../shared/enums/mask-apply-mode.enum";
import { ProcessMode } from "../../shared/enums/process-mode.enum";
import { SelectionTool } from "../../shared/enums/selection-tool.enum";

interface ToolBarProps {
  processMode: ProcessMode;
  onProcessModeChange: (mode: ProcessMode) => void;
  selectionTool: SelectionTool;
  onSelectionToolChange: (tool: SelectionTool) => void;
  brushTool: BrushTool;
  onBrushToolChange: (tool: BrushTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  maskApplyMode: MaskApplyMode;
  onMaskApplyModeChange: (mode: MaskApplyMode) => void;
  onClearMask: () => void;
  onApplyMaskToAll: () => void;
  onRun: () => void;
  onRunBatch: () => void;
  running: boolean;
  canRun: boolean;
  batchCount: number;
}

export function ToolBar(props: ToolBarProps) {
  const {
    processMode,
    onProcessModeChange,
    selectionTool,
    onSelectionToolChange,
    brushTool,
    onBrushToolChange,
    brushSize,
    onBrushSizeChange,
    maskApplyMode,
    onMaskApplyModeChange,
    onClearMask,
    onApplyMaskToAll,
    onRun,
    onRunBatch,
    running,
    canRun,
    batchCount,
  } = props;

  const manual = processMode === ProcessMode.ManualBrush;

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <label>
          模式
          <select
            value={processMode}
            onChange={(e) => onProcessModeChange(e.target.value as ProcessMode)}
          >
            <option value={ProcessMode.ManualBrush}>手动消除</option>
            <option value={ProcessMode.Auto}>自动消除</option>
          </select>
        </label>
      </div>

      {manual && (
        <div className="toolbar__group toolbar__tools">
          <button
            type="button"
            className={selectionTool === SelectionTool.Brush ? "is-active" : ""}
            onClick={() => onSelectionToolChange(SelectionTool.Brush)}
          >
            画笔
          </button>
          <button
            type="button"
            className={selectionTool === SelectionTool.Rectangle ? "is-active" : ""}
            onClick={() => onSelectionToolChange(SelectionTool.Rectangle)}
          >
            矩形
          </button>
          <button type="button" onClick={onClearMask}>
            清空选区
          </button>
        </div>
      )}

      {manual && selectionTool === SelectionTool.Brush && (
        <div className="toolbar__group">
          <button
            type="button"
            className={brushTool === BrushTool.Paint ? "is-active" : ""}
            onClick={() => onBrushToolChange(BrushTool.Paint)}
          >
            涂抹
          </button>
          <button
            type="button"
            className={brushTool === BrushTool.Erase ? "is-active" : ""}
            onClick={() => onBrushToolChange(BrushTool.Erase)}
          >
            橡皮
          </button>
          <label className="toolbar__size">
            大小
            <input
              type="range"
              min={BRUSH_DEFAULTS.minSize}
              max={BRUSH_DEFAULTS.maxSize}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      {manual && selectionTool === SelectionTool.Rectangle && (
        <p className="toolbar__hint">框选你想消除的区域，可连续框选多个。</p>
      )}

      <div className="toolbar__group">
        <label>
          <input
            type="checkbox"
            checked={maskApplyMode === MaskApplyMode.ReuseSelection}
            onChange={(e) =>
              onMaskApplyModeChange(
                e.target.checked
                  ? MaskApplyMode.ReuseSelection
                  : MaskApplyMode.PerImage,
              )
            }
          />
          选区复用到全部
        </label>
        <button type="button" onClick={onApplyMaskToAll} disabled={batchCount < 2}>
          应用到全部
        </button>
      </div>

      <div className="toolbar__group toolbar__group--actions">
        <button type="button" className="btn-primary" disabled={!canRun || running} onClick={onRun}>
          {running ? "处理中…" : "去水印"}
        </button>
        <button
          type="button"
          disabled={batchCount < 2 || running}
          onClick={onRunBatch}
        >
          全部处理 ({batchCount})
        </button>
      </div>
    </div>
  );
}
