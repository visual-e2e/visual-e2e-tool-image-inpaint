import { ExportQuality } from "../../shared/enums/export-quality.enum.js";
import { ProcessMode } from "../../shared/enums/process-mode.enum.js";
import { ErrorCode } from "../../shared/enums/error-code.enum.js";
import { AppError } from "../../shared/errors/app-error.js";
import { decodeBase64Image } from "../../shared/utils/image-meta.js";
import type { InpaintProvider } from "./providers/inpaint-provider.js";
import { HttpAiInpaintProvider } from "./providers/http-ai.provider.js";
import { MockInpaintProvider } from "./providers/mock.provider.js";
import { JobStatus } from "../../shared/enums/job-status.enum.js";
import {
  healthUrlFromInpaintUrl,
  resolveEffectiveSettings,
  type InpaintSettings,
} from "./inpaint-settings.service.js";

export interface InpaintRequestDto {
  mode: ProcessMode;
  imageBase64: string;
  maskBase64?: string;
  exportQuality?: ExportQuality;
}

export function createInpaintProviderFromSettings(
  settings: InpaintSettings | null,
): InpaintProvider {
  if (settings?.apiUrl) {
    return new HttpAiInpaintProvider(settings.apiUrl, settings.apiKey);
  }
  return new MockInpaintProvider();
}

export async function createInpaintProvider(): Promise<InpaintProvider> {
  const settings = await resolveEffectiveSettings();
  return createInpaintProviderFromSettings(settings);
}

export class InpaintService {
  constructor(private provider: InpaintProvider) {}

  getProviderName(): string {
    return this.provider.name;
  }

  setProvider(provider: InpaintProvider): void {
    this.provider = provider;
  }

  async applySettings(settings: InpaintSettings | null): Promise<void> {
    this.provider = createInpaintProviderFromSettings(settings);
  }

  async testConnection(settings: InpaintSettings): Promise<{
    ok: boolean;
    message: string;
  }> {
    const healthUrl = healthUrlFromInpaintUrl(settings.apiUrl);
    const headers: Record<string, string> = {};
    if (settings.apiKey) {
      headers.Authorization = `Bearer ${settings.apiKey}`;
    }

    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        return {
          ok: false,
          message: `健康检查失败（HTTP ${response.status}）：${healthUrl}`,
        };
      }
      return { ok: true, message: `已连接：${healthUrl}` };
    } catch (err) {
      return {
        ok: false,
        message: `无法连接 ${healthUrl}：${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

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
