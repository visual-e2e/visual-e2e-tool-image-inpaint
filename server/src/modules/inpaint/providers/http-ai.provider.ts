import { ErrorCode } from "../../../shared/enums/error-code.enum.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { InpaintInput, InpaintOutput, InpaintProvider } from "./inpaint-provider.js";

/**
 * Optional remote AI endpoint.
 * Expects POST JSON: { imageBase64, maskBase64?, mode } → { resultBase64, width, height }
 */
export class HttpAiInpaintProvider implements InpaintProvider {
  readonly name = "http-ai";

  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string,
  ) {}

  async inpaint(input: InpaintInput): Promise<InpaintOutput> {
    const body = {
      mode: input.mode,
      imageBase64: input.imageBuffer.toString("base64"),
      maskBase64: input.maskBuffer?.toString("base64"),
      exportQuality: input.exportQuality,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AppError(
        `AI 服务不可达：${err instanceof Error ? err.message : String(err)}`,
        ErrorCode.InpaintFailed,
        502,
      );
    }

    const data = (await response.json().catch(() => ({}))) as {
      resultBase64?: string;
      width?: number;
      height?: number;
      error?: string;
    };

    if (!response.ok || !data.resultBase64 || !data.width || !data.height) {
      throw new AppError(
        data.error ?? "AI 去水印失败",
        ErrorCode.InpaintFailed,
        502,
      );
    }

    return {
      resultBuffer: Buffer.from(data.resultBase64, "base64"),
      width: data.width,
      height: data.height,
      mime: "image/png",
      provider: this.name,
    };
  }
}
