import { httpJson } from "./http-client";

export type InpaintConfigSource = "persisted" | "env" | "none";

export interface InpaintConfigResponse {
  configured: boolean;
  apiUrl: string | null;
  hasApiKey: boolean;
  provider: string;
  source: InpaintConfigSource;
  ok?: boolean;
}

export interface InpaintConfigTestResponse {
  ok: boolean;
  message: string;
  error?: string;
}

export function getInpaintConfig(): Promise<InpaintConfigResponse> {
  return httpJson<InpaintConfigResponse>("/api/inpaint/config");
}

export function saveInpaintConfig(body: {
  apiUrl: string;
  apiKey?: string;
}): Promise<InpaintConfigResponse> {
  return httpJson<InpaintConfigResponse>("/api/inpaint/config", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function clearInpaintConfig(): Promise<InpaintConfigResponse> {
  return httpJson<InpaintConfigResponse>("/api/inpaint/config", {
    method: "PUT",
    body: JSON.stringify({ clear: true }),
  });
}

export function testInpaintConfig(body: {
  apiUrl?: string;
  apiKey?: string;
}): Promise<InpaintConfigTestResponse> {
  return httpJson<InpaintConfigTestResponse>("/api/inpaint/config/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
