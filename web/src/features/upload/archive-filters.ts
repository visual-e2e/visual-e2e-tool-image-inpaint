import { UPLOAD_LIMITS } from "../../shared/constants/upload.constants";
import { ErrorCode } from "../../shared/enums/error-code.enum";
import { getExtension, isImageFile } from "./image-validators";

export function shouldSkipArchiveEntry(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  const base = normalized.split("/").pop() ?? normalized;
  if (!base || base.startsWith(".")) return true;
  if (normalized.includes("__MACOSX/")) return true;
  return false;
}

export async function extractImagesFromZip(file: File): Promise<File[]> {
  if (file.size > UPLOAD_LIMITS.maxZipBytes) {
    throw Object.assign(new Error("压缩包不能超过 200MB"), {
      code: ErrorCode.ArchiveTooLarge,
    });
  }

  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const images: File[] = [];

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir || shouldSkipArchiveEntry(entry.name)) continue;
    const name = entry.name.split("/").pop() ?? entry.name;
    const fake = new File([], name);
    if (!isImageFile(fake) && !(UPLOAD_LIMITS.acceptImageExt as readonly string[]).includes(getExtension(name))) {
      continue;
    }
    const blob = await entry.async("blob");
    const mime = name.toLowerCase().endsWith(".png")
      ? "image/png"
      : name.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    images.push(new File([blob], name, { type: mime }));
    if (images.length > UPLOAD_LIMITS.maxBatchImages) {
      throw Object.assign(new Error(`最多支持 ${UPLOAD_LIMITS.maxBatchImages} 张图片`), {
        code: ErrorCode.TooManyImages,
      });
    }
  }

  if (images.length === 0) {
    throw Object.assign(new Error("压缩包内未找到可用图片"), {
      code: ErrorCode.InvalidImage,
    });
  }

  return images;
}
