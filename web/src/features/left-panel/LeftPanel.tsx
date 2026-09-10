import { ProcessMode } from "../../shared/enums/process-mode.enum";
import type { BrushTool } from "../../shared/enums/brush-tool.enum";
import { SelectionTool } from "../../shared/enums/selection-tool.enum";
import { Typography } from "antd";
import { ModeTabs } from "./ModeTabs";
import { SelectionToolGrid } from "./SelectionToolGrid";
import { HowToCard } from "./HowToCard";
import { RemoveAction } from "./RemoveAction";

interface LeftPanelProps {
  processMode: ProcessMode;
  onProcessModeChange: (mode: ProcessMode) => void;
  selectionTool: SelectionTool;
  onSelectionToolChange: (tool: SelectionTool) => void;
  brushTool: BrushTool;
  onBrushToolChange: (tool: BrushTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onClearMask: () => void;
  canRemove: boolean;
  running: boolean;
  onRemove: () => void;
  onRemoveAll: () => void;
  batchCount: number;
}

export function LeftPanel(props: LeftPanelProps) {
  const manual = props.processMode === ProcessMode.ManualBrush;

  return (
    <div className="left-panel">
      <ModeTabs mode={props.processMode} onChange={props.onProcessModeChange} />

      <SelectionToolGrid
        visible={manual}
        selectionTool={props.selectionTool}
        onSelectionToolChange={props.onSelectionToolChange}
        brushTool={props.brushTool}
        onBrushToolChange={props.onBrushToolChange}
        brushSize={props.brushSize}
        onBrushSizeChange={props.onBrushSizeChange}
        onClearMask={props.onClearMask}
      />

      {!manual && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          自动模式将智能识别水印区域，点击下方「消除」即可。
        </Typography.Paragraph>
      )}

      {manual && <HowToCard selectionTool={props.selectionTool} />}

      <div className="left-panel__spacer" />

      <RemoveAction
        disabled={!props.canRemove}
        running={props.running}
        onRemove={props.onRemove}
        onRemoveAll={props.onRemoveAll}
        showRemoveAll={props.batchCount > 1}
      />
    </div>
  );
}
