import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import type { FastifyInstance } from "fastify";
import { ErrorCode } from "../../shared/enums/error-code.enum.js";
import { AppError } from "../../shared/errors/app-error.js";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_FILES = 50;

function mimeFromExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function registerFolderRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { folder: string } }>("/api/folder/list-images", async (req, reply) => {
    try {
      const folder = req.body?.folder;
      if (!folder) {
        throw new AppError("缺少 folder", ErrorCode.FolderReadFailed);
      }

      const entries = await readdir(folder);
      const files = [];

      for (const name of entries) {
        const ext = extname(name).toLowerCase();
        if (!IMAGE_EXT.has(ext)) continue;
        const full = join(folder, name);
        const info = await stat(full);
        if (!info.isFile()) continue;
        const buf = await readFile(full);
        files.push({
          name,
          path: full,
          base64: buf.toString("base64"),
          mime: mimeFromExt(ext),
        });
        if (files.length >= MAX_FILES) break;
      }

      if (!files.length) {
        throw new AppError("文件夹内未找到图片", ErrorCode.FolderReadFailed);
      }

      return { folder, files };
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.message, code: err.code });
      }
      return reply.code(500).send({
        error: err instanceof Error ? err.message : String(err),
        code: ErrorCode.FolderReadFailed,
      });
    }
  });
}
