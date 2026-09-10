import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ErrorCode } from "../../shared/enums/error-code.enum.js";
import { AppError } from "../../shared/errors/app-error.js";

const LOCAL_CACHE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../data/cache",
);

export function resolveCacheRoot(requested?: string): string {
  if (!requested || requested.startsWith("local://")) {
    return LOCAL_CACHE_ROOT;
  }
  return resolve(requested);
}

function assertInsideRoot(root: string, target: string): string {
  const normalizedRoot = resolve(root) + sep;
  const normalizedTarget = resolve(target);
  if (!normalizedTarget.startsWith(normalizedRoot) && normalizedTarget !== resolve(root)) {
    throw new AppError("非法缓存路径", ErrorCode.CacheMissing, 400);
  }
  return normalizedTarget;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export class CacheService {
  async save(params: {
    cacheRoot: string;
    session: unknown;
    files?: Array<{ relativePath: string; base64: string }>;
  }) {
    const root = resolveCacheRoot(params.cacheRoot);
    await mkdir(root, { recursive: true });
    const missingPaths: string[] = [];

    for (const file of params.files ?? []) {
      const relative = normalize(file.relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
      const full = assertInsideRoot(root, join(root, relative));
      try {
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, Buffer.from(file.base64, "base64"));
      } catch {
        missingPaths.push(relative);
      }
    }

    const sessionPath = join(root, "session.json");
    await writeFile(sessionPath, JSON.stringify(params.session, null, 2), "utf8");

    return { ok: true, cacheRoot: root, missingPaths };
  }

  async load(cacheRoot: string) {
    const root = resolveCacheRoot(cacheRoot);
    const sessionPath = join(root, "session.json");
    if (!(await pathExists(sessionPath))) {
      return {
        status: "missing" as const,
        missingPaths: ["session.json"],
        message: "缓存会话不存在（目录可能已被清理）",
      };
    }

    const raw = await readFile(sessionPath, "utf8");
    const session = JSON.parse(raw) as {
      session?: {
        items?: Array<{
          relativeSourcePath?: string;
          relativeMaskPath?: string;
          relativeResultPath?: string;
        }>;
      };
    };

    const missingPaths: string[] = [];
    for (const item of session.session?.items ?? []) {
      for (const rel of [
        item.relativeSourcePath,
        item.relativeMaskPath,
        item.relativeResultPath,
      ]) {
        if (!rel) continue;
        const full = join(root, rel);
        if (!(await pathExists(full))) missingPaths.push(rel);
      }
    }

    return {
      status: missingPaths.length ? ("missing" as const) : ("ready" as const),
      session,
      missingPaths,
      message: missingPaths.length
        ? "部分缓存文件缺失，可能已被清理"
        : undefined,
    };
  }

  async readFileBase64(cacheRoot: string, relativePath: string) {
    const root = resolveCacheRoot(cacheRoot);
    const relative = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = assertInsideRoot(root, join(root, relative));
    if (!(await pathExists(full))) {
      return { ok: false, missing: true, path: relative };
    }
    const buf = await readFile(full);
    return { ok: true, base64: buf.toString("base64"), path: relative };
  }
}
