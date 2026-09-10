import {
  ColumnWidthOutlined,
  DownloadOutlined,
  DragOutlined,
  ExpandOutlined,
  RedoOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { Button, Flex, Slider, Tooltip } from "antd";

interface CanvasFloatingBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (value: number) => void;
  onFit: () => void;
  panMode: boolean;
  onTogglePan: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
  canCompare: boolean;
  canDownload: boolean;
  onDownload: () => void;
}

export function CanvasFloatingBar(props: CanvasFloatingBarProps) {
  return (
    <div className="canvas-bar">
      <Flex gap={4} align="center">
        <Tooltip title="撤销">
          <Button
            type="text"
            icon={<UndoOutlined />}
            disabled={!props.canUndo}
            onClick={props.onUndo}
          />
        </Tooltip>
        <Tooltip title="重做">
          <Button
            type="text"
            icon={<RedoOutlined />}
            disabled={!props.canRedo}
            onClick={props.onRedo}
          />
        </Tooltip>
      </Flex>

      <Flex gap={4} align="center" className="canvas-bar__zoom">
        <Tooltip title="缩小">
          <Button type="text" icon={<ZoomOutOutlined />} onClick={props.onZoomOut} />
        </Tooltip>
        <Slider
          min={0.25}
          max={3}
          step={0.05}
          value={props.scale}
          onChange={props.onZoomChange}
          style={{ width: 100, margin: 0 }}
          tooltip={{ formatter: (v) => `${Math.round((v ?? 1) * 100)}%` }}
        />
        <Tooltip title="放大">
          <Button type="text" icon={<ZoomInOutlined />} onClick={props.onZoomIn} />
        </Tooltip>
        <Tooltip title="适应画布">
          <Button type="text" icon={<ExpandOutlined />} onClick={props.onFit} />
        </Tooltip>
      </Flex>

      <Flex gap={4} align="center">
        <Tooltip title={props.panMode ? "平移中（再点一次退出，或点画笔/矩形继续选区）" : "平移"}>
          <Button
            type={props.panMode ? "primary" : "text"}
            icon={<DragOutlined />}
            onClick={props.onTogglePan}
          />
        </Tooltip>
        <Tooltip title="前后对比">
          <Button
            type={props.compareMode ? "primary" : "text"}
            icon={<ColumnWidthOutlined />}
            disabled={!props.canCompare}
            onClick={props.onToggleCompare}
          />
        </Tooltip>
        <Tooltip title="下载当前结果">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            disabled={!props.canDownload}
            onClick={props.onDownload}
          />
        </Tooltip>
      </Flex>
    </div>
  );
}
