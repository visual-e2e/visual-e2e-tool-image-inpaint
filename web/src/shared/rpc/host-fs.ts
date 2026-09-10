import { getRpcClient, isEmbedded } from "@visual-e2e/rpc-sdk";
import { CACHE_DIR_NAME } from "../constants/upload.constants";
import type { CachePaths } from "../types/cache.types";

function joinPath(base: string, ...parts: string[]): string {
  const sep = base.includes("\\") ? "\\" : "/";
  const trimmed = parts.map((p) => p.replace(/^[/\\]+|[/\\]+$/g, ""));
  return [base.replace(/[/\\]+$/g, ""), ...trimmed].join(sep);
}

export async function resolveCachePaths(): Promise<CachePaths> {
  if (isEmbedded()) {
    try {
      const dirs = await getRpcClient().getDataDir();
      const cacheRoot = joinPath(dirs.tools, CACHE_DIR_NAME);
      return {
        storage: dirs.storage,
        tools: dirs.tools,
        cacheRoot,
        sessionFile: joinPath(cacheRoot, "session.json"),
      };
    } catch {
      // fall through to local default
    }
  }

  return {
    cacheRoot: "local://image-inpaint-cache",
    sessionFile: "local://image-inpaint-cache/session.json",
  };
}

export async function pickImagesFolder(): Promise<string | null> {
  if (!isEmbedded()) {
    throw new Error("请在应用中心内打开本工具后再选择文件夹");
  }
  const result = await getRpcClient().pickFolder();
  return result.path;
}

export function subscribeCacheClear(onClear: () => void): () => void {
  if (!isEmbedded()) return () => undefined;
  const client = getRpcClient();
  return client.onNotify((msg) => {
    if (msg.method === "cache.clear") {
      onClear();
    }
  });
}
