import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { ErrorCode } from "../../../shared/enums/error-code.enum.js";
import { ProcessMode } from "../../../shared/enums/process-mode.enum.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { InpaintInput, InpaintOutput, InpaintProvider } from "./inpaint-provider.js";

type JimpImage = Awaited<ReturnType<typeof Jimp.read>>;

/**
 * Local mock inpaint: fill masked (bright) pixels with neighborhood average.
 * Keeps original width/height so the quality contract can be verified end-to-end.
 */
export class MockInpaintProvider implements InpaintProvider {
  readonly name = "mock";

  async inpaint(input: InpaintInput): Promise<InpaintOutput> {
    const image = await Jimp.read(input.imageBuffer);
    const width = image.width;
    const height = image.height;

    if (input.mode === ProcessMode.ManualBrush && !input.maskBuffer) {
      throw new AppError("手动模式需要 mask", ErrorCode.InvalidMask);
    }

    if (input.maskBuffer) {
      const mask = await Jimp.read(input.maskBuffer);
      if (mask.width !== width || mask.height !== height) {
        mask.resize({ w: width, h: height });
      }

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const { r, g, b, a } = intToRGBA(mask.getPixelColor(x, y));
          const luminance = (r + g + b) / 3;
          if (a < 16 || luminance < 32) continue;
          image.setPixelColor(sampleNeighborhood(image, x, y, 4), x, y);
        }
      }
    } else {
      softenCorners(image);
    }

    const mime = "image/png";
    const resultBuffer = await image.getBuffer(mime);
    return {
      resultBuffer,
      width,
      height,
      mime,
      provider: this.name,
      message: "mock provider",
    };
  }
}

function sampleNeighborhood(
  image: JimpImage,
  x: number,
  y: number,
  radius: number,
): number {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= image.width || yy >= image.height) continue;
      if (xx === x && yy === y) continue;
      const c = intToRGBA(image.getPixelColor(xx, yy));
      r += c.r;
      g += c.g;
      b += c.b;
      a += c.a;
      count += 1;
    }
  }
  if (!count) return image.getPixelColor(x, y);
  return rgbaToInt(
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count),
    Math.round(a / count),
  );
}

function softenCorners(image: JimpImage): void {
  const band = Math.max(8, Math.round(Math.min(image.width, image.height) * 0.08));
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const nearEdge =
        x < band || y < band || x >= image.width - band || y >= image.height - band;
      if (!nearEdge) continue;
      const { r, g, b } = intToRGBA(image.getPixelColor(x, y));
      if (r > 200 && g > 200 && b > 200) {
        image.setPixelColor(sampleNeighborhood(image, x, y, 6), x, y);
      }
    }
  }
}
