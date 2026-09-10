import type { ExportQuality } from "../../../shared/enums/export-quality.enum.js";
import type { ProcessMode } from "../../../shared/enums/process-mode.enum.js";

export interface InpaintInput {
  mode: ProcessMode;
  imageBuffer: Buffer;
  maskBuffer?: Buffer;
  exportQuality: ExportQuality;
}

export interface InpaintOutput {
  resultBuffer: Buffer;
  width: number;
  height: number;
  mime: string;
  provider: string;
  message?: string;
}

export interface InpaintProvider {
  readonly name: string;
  inpaint(input: InpaintInput): Promise<InpaintOutput>;
}
