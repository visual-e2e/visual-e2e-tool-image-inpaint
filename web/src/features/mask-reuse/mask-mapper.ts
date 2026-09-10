import { BrushTool } from "../../shared/enums/brush-tool.enum";
import { MaskSpace } from "../../shared/enums/mask-space.enum";
import type {
  NormalizedRect,
  NormalizedStroke,
  ReusableMask,
} from "../../shared/types/mask.types";

export function createEmptyReusableMask(sourceBatchItemId: string): ReusableMask {
  return {
    space: MaskSpace.Normalized,
    rects: [],
    strokes: [],
    sourceBatchItemId,
    updatedAt: Date.now(),
  };
}

export function appendStroke(
  mask: ReusableMask,
  stroke: NormalizedStroke,
): ReusableMask {
  return {
    ...mask,
    strokes: [...mask.strokes, stroke],
    updatedAt: Date.now(),
  };
}

export function appendRect(mask: ReusableMask, rect: NormalizedRect): ReusableMask {
  return {
    ...mask,
    rects: [...mask.rects, rect],
    updatedAt: Date.now(),
  };
}

/** Render normalized strokes onto a same-size mask canvas (white = inpaint). */
export function renderReusableMask(
  reusable: ReusableMask,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);
  const minSide = Math.min(width, height);

  for (const rect of reusable.rects) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      rect.x * width,
      rect.y * height,
      rect.width * width,
      rect.height * height,
    );
  }

  for (const stroke of reusable.strokes) {
    const radius = Math.max(1, (stroke.sizeRatio * minSide) / 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radius * 2;
    ctx.strokeStyle = stroke.tool === BrushTool.Erase ? "rgba(0,0,0,1)" : "#ffffff";
    ctx.fillStyle = stroke.tool === BrushTool.Erase ? "rgba(0,0,0,1)" : "#ffffff";
    ctx.globalCompositeOperation =
      stroke.tool === BrushTool.Erase ? "destination-out" : "source-over";

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      const x = p.x * width;
      const y = p.y * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

export function canvasToMaskDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function hasMaskContent(reusable: ReusableMask | null): boolean {
  if (!reusable) return false;
  return reusable.rects.length > 0 || reusable.strokes.length > 0;
}
