import type { BrushTool } from "../enums/brush-tool.enum";
import type { MaskSpace } from "../enums/mask-space.enum";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface NormalizedStroke {
  tool: BrushTool;
  sizeRatio: number;
  points: NormalizedPoint[];
}

export interface ReusableMask {
  space: MaskSpace.Normalized;
  rects: NormalizedRect[];
  strokes: NormalizedStroke[];
  sourceBatchItemId: string;
  updatedAt: number;
}
