import { UPLOAD_LIMITS } from "../../shared/constants/upload.constants";
import { ErrorCode } from "../../shared/enums/error-code.enum";
import { ImageFormat } from "../../shared/enums/image-format.enum";

export function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export function isImageFile(file: File): boolean {
  const ext = getExtension(file.name);
  if ((UPLOAD_LIMITS.acceptImageExt as readonly string[]).includes(ext)) {
    return true;
  }
  return (UPLOAD_LIMITS.acceptImageMime as readonly string[]).includes(file.type);
}

export function isZipFile(file: File): boolean {
  const ext = getExtension(file.name);
  return (UPLOAD_LIMITS.acceptZipExt as readonly string[]).includes(ext)
    || file.type === "application/zip"
    || file.type === "application/x-zip-compressed";
}

export function assertImageFile(file: File): void {
  if (!isImageFile(file)) {
    throw Object.assign(new Error("仅支持 JPG / PNG / WEBP 图片"), {
      code: ErrorCode.InvalidImage,
    });
  }
  if (file.size > UPLOAD_LIMITS.maxImageBytes) {
    throw Object.assign(new Error("单张图片不能超过 25MB"), {
      code: ErrorCode.InvalidImage,
    });
  }
}

export function formatFromFileName(name: string): ImageFormat {
  const ext = getExtension(name);
  if (ext === ".png") return ImageFormat.Png;
  if (ext === ".webp") return ImageFormat.Webp;
  return ImageFormat.Jpeg;
}

export function loadImageMeta(
  objectUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("无法读取图片尺寸"));
    img.src = objectUrl;
  });
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function base64ToObjectUrl(base64: string, mime = "image/png"): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}
