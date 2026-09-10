import type { BrushTool } from "../../shared/enums/brush-tool.enum";
import type { NormalizedStroke } from "../../shared/types/mask.types";

export interface StrokeCapture {
  tool: BrushTool;
  brushSize: number;
  imageWidth: number;
  imageHeight: number;
  points: Array<{ x: number; y: number }>;
}

export function toNormalizedStroke(capture: StrokeCapture): NormalizedStroke {
  const minSide = Math.min(capture.imageWidth, capture.imageHeight) || 1;
  return {
    tool: capture.tool,
    sizeRatio: capture.brushSize / minSide,
    points: capture.points.map((p) => ({
      x: p.x / capture.imageWidth,
      y: p.y / capture.imageHeight,
    })),
  };
}
