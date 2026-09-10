export const UPLOAD_LIMITS = {
  maxImageBytes: 25 * 1024 * 1024,
  maxZipBytes: 200 * 1024 * 1024,
  maxBatchImages: 50,
  acceptImageExt: [".jpg", ".jpeg", ".png", ".webp"] as const,
  acceptZipExt: [".zip"] as const,
  acceptImageMime: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
};

export const BRUSH_DEFAULTS = {
  minSize: 4,
  maxSize: 80,
  defaultSize: 24,
};

export const BATCH_CONCURRENCY = 2;

export const CACHE_DIR_NAME = "image-inpaint";
export const CACHE_SESSION_FILE = "session.json";
export const CACHE_VERSION = 1;
