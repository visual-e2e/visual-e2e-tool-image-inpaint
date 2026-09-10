import { ExportQuality } from "../../shared/enums/export-quality.enum.js";
import { ProcessMode } from "../../shared/enums/process-mode.enum.js";
import { ErrorCode } from "../../shared/enums/error-code.enum.js";
import { AppError } from "../../shared/errors/app-error.js";
import { decodeBase64Image } from "../../shared/utils/image-meta.js";
import type { InpaintProvider } from "./providers/inpaint-provider.js";
import { HttpAiInpaintProvider } from "./providers/http-ai.provider.js";
import { MockInpaintProvider } from "./providers/mock.provider.js";
import { JobStatus } from "../../shared/enums/job-status.enum.js";

export interface InpaintRequestDto {
  mode: ProcessMode;
  imageBase64: string;
  maskBase64?: string;
  exportQuality?: ExportQuality;
}

export function createInpaintProvider(): InpaintProvider {
  const endpoint = process.env.INPAINT_API_URL;
  if (endpoint) {
    return new HttpAiInpaintProvider(endpoint, process.env.INPAINT_API_KEY);
  }
  return new MockInpaintProvider();
}

export class InpaintService {
  constructor(private readonly provider: InpaintProvider) {}

  async run(dto: InpaintRequestDto) {
    if (!dto.imageBase64) {
      throw new AppError("缺少 imageBase64", ErrorCode.InvalidImage);
    }
    if (!Object.values(ProcessMode).includes(dto.mode)) {
      throw new AppError("无效的 process mode", ErrorCode.InvalidImage);
    }

    const imageBuffer = decodeBase64Image(dto.imageBase64);
    const maskBuffer = dto.maskBase64
      ? decodeBase64Image(dto.maskBase64)
      : undefined;

    const output = await this.provider.inpaint({
      mode: dto.mode,
      imageBuffer,
      maskBuffer,
      exportQuality: dto.exportQuality ?? ExportQuality.Original,
    });

    return {
      jobId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      status: JobStatus.Succeeded,
      resultBase64: output.resultBuffer.toString("base64"),
      width: output.width,
      height: output.height,
      provider: output.provider,
      message: output.message,
    };
  }
}
