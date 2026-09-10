import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathExists } from "../cache/cache.service.js";

export interface InpaintSettings {
  apiUrl: string;
  apiKey?: string;
}

const SETTINGS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../data/settings.json",
);

function normalizeUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export async function loadPersistedSettings(): Promise<InpaintSettings | null> {
  if (!(await pathExists(SETTINGS_PATH))) return null;
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<InpaintSettings>;
    const apiUrl = typeof parsed.apiUrl === "string" ? normalizeUrl(parsed.apiUrl) : "";
    if (!apiUrl) return null;
    const apiKey =
      typeof parsed.apiKey === "string" && parsed.apiKey.trim()
        ? parsed.apiKey.trim()
        : undefined;
    return { apiUrl, apiKey };
  } catch {
    return null;
  }
}

export async function savePersistedSettings(
  settings: InpaintSettings,
): Promise<InpaintSettings> {
  const apiUrl = normalizeUrl(settings.apiUrl);
  if (!apiUrl) {
    throw new Error("apiUrl 不能为空");
  }
  try {
    void new URL(apiUrl);
  } catch {
    throw new Error("apiUrl 不是合法 URL");
  }

  const next: InpaintSettings = {
    apiUrl,
    apiKey:
      typeof settings.apiKey === "string" && settings.apiKey.trim()
        ? settings.apiKey.trim()
        : undefined,
  };

  await mkdir(dirname(SETTINGS_PATH), { recursive: true });
  await writeFile(SETTINGS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function clearPersistedSettings(): Promise<void> {
  if (!(await pathExists(SETTINGS_PATH))) return;
  await unlink(SETTINGS_PATH);
}

/** Resolve effective endpoint: persisted settings win over env. */
export async function resolveEffectiveSettings(): Promise<InpaintSettings | null> {
  const persisted = await loadPersistedSettings();
  if (persisted?.apiUrl) return persisted;

  const envUrl = process.env.INPAINT_API_URL?.trim();
  if (envUrl) {
    return {
      apiUrl: normalizeUrl(envUrl),
      apiKey: process.env.INPAINT_API_KEY?.trim() || undefined,
    };
  }
  return null;
}

export function healthUrlFromInpaintUrl(apiUrl: string): string {
  try {
    const u = new URL(apiUrl);
    const path = u.pathname.replace(/\/+$/, "");
    if (path.endsWith("/inpaint")) {
      u.pathname = `${path.slice(0, -"/inpaint".length)}/health` || "/health";
    } else {
      u.pathname = "/health";
    }
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return apiUrl.replace(/\/inpaint\/?$/, "") + "/health";
  }
}
