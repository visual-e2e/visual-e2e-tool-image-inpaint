import { useCallback, useEffect, useRef, useState } from "react";
import { BrushTool } from "../../shared/enums/brush-tool.enum";
import { BRUSH_DEFAULTS } from "../../shared/constants/upload.constants";
import { toNormalizedStroke } from "../mask-reuse/stroke-normalize";
import type { NormalizedRect, NormalizedStroke } from "../../shared/types/mask.types";

interface UseBrushCanvasOptions {
  width: number;
  height: number;
  enabled: boolean;
  onStrokeEnd?: (stroke: NormalizedStroke) => void;
}

export function useBrushCanvas(options: UseBrushCanvasOptions) {
  const { width, height, enabled, onStrokeEnd } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const points = useRef<Array<{ x: number; y: number }>>([]);
  const [tool, setTool] = useState<BrushTool>(BrushTool.Paint);
  const [brushSize, setBrushSize] = useState(BRUSH_DEFAULTS.defaultSize);

  const redrawFromMask = useCallback(
    (strokes: NormalizedStroke[], rects: NormalizedRect[] = []) => {
      const canvas = canvasRef.current;
      if (!canvas || !width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#ffffff";
      for (const rect of rects) {
        ctx.fillRect(
          rect.x * width,
          rect.y * height,
          rect.width * width,
          rect.height * height,
        );
      }

      const minSide = Math.min(width, height);
      for (const stroke of strokes) {
        const radius = Math.max(1, (stroke.sizeRatio * minSide) / 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = radius * 2;
        ctx.globalCompositeOperation =
          stroke.tool === BrushTool.Erase ? "destination-out" : "source-over";
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "#ffffff";

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
    },
    [width, height],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      const prev = canvas.toDataURL();
      canvas.width = width;
      canvas.height = height;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
      };
      img.src = prev;
    }
  }, [width, height]);

  const toImagePoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    return { x, y };
  };

  const paintDot = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation =
      tool === BrushTool.Erase ? "destination-out" : "source-over";
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = toImagePoint(event);
    points.current = [p];
    paintDot(p.x, p.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || !drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = toImagePoint(event);
    const prev = points.current[points.current.length - 1];
    points.current.push(p);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation =
      tool === BrushTool.Erase ? "destination-out" : "source-over";
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (points.current.length && onStrokeEnd) {
      onStrokeEnd(
        toNormalizedStroke({
          tool,
          brushSize,
          imageWidth: width,
          imageHeight: height,
          points: points.current,
        }),
      );
    }
    points.current = [];
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const exportMaskDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  return {
    canvasRef,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    clear,
    exportMaskDataUrl,
    redrawFromMask,
  };
}
