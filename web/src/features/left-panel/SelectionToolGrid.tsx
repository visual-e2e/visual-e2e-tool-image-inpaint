import {
  BorderOutlined,
  ClearOutlined,
  DeleteOutlined,
  HighlightOutlined,
  ScanOutlined,
} from "@ant-design/icons";
import { Button, Flex, Slider, Space, Typography } from "antd";
import { BrushTool } from "../../shared/enums/brush-tool.enum";
import { BRUSH_DEFAULTS } from "../../shared/constants/upload.constants";
import { SelectionTool } from "../../shared/enums/selection-tool.enum";

interface SelectionToolGridProps {
  selectionTool: SelectionTool;
  onSelectionToolChange: (tool: SelectionTool) => void;
  brushTool: BrushTool;
  onBrushToolChange: (tool: BrushTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onClearMask: () => void;
  visible: boolean;
}

export function SelectionToolGrid(props: SelectionToolGridProps) {
  const {
    selectionTool,
    onSelectionToolChange,
    brushTool,
    onBrushToolChange,
    brushSize,
    onBrushSizeChange,
    onClearMask,
    visible,
  } = props;

  if (!visible) return null;

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Flex gap={8} wrap="wrap">
        <Button
          type={selectionTool === SelectionTool.Brush ? "primary" : "default"}
          icon={<HighlightOutlined />}
          onClick={() => onSelectionToolChange(SelectionTool.Brush)}
        >
          画笔
        </Button>
        <Button
          type={selectionTool === SelectionTool.Rectangle ? "primary" : "default"}
          icon={<BorderOutlined />}
          onClick={() => onSelectionToolChange(SelectionTool.Rectangle)}
        >
          矩形
        </Button>
        <Button
          type={selectionTool === SelectionTool.AutoDetect ? "primary" : "default"}
          icon={<ScanOutlined />}
          onClick={() => onSelectionToolChange(SelectionTool.AutoDetect)}
        >
          自动检测
        </Button>
      </Flex>

      {selectionTool === SelectionTool.Brush && (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Flex gap={8}>
            <Button
              type={brushTool === BrushTool.Paint ? "primary" : "default"}
              icon={<HighlightOutlined />}
              onClick={() => onBrushToolChange(BrushTool.Paint)}
            >
              涂抹
            </Button>
            <Button
              type={brushTool === BrushTool.Erase ? "primary" : "default"}
              icon={<ClearOutlined />}
              onClick={() => onBrushToolChange(BrushTool.Erase)}
            >
              橡皮
            </Button>
          </Flex>
          <Typography.Text type="secondary">大小 {brushSize}</Typography.Text>
          <Slider
            min={BRUSH_DEFAULTS.minSize}
            max={BRUSH_DEFAULTS.maxSize}
            value={brushSize}
            onChange={onBrushSizeChange}
          />
        </Space>
      )}

      <Button block icon={<DeleteOutlined />} onClick={onClearMask}>
        清空选区
      </Button>
    </Space>
  );
}
