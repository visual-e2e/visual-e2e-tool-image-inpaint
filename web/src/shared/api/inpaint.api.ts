import { httpJson } from "./http-client";
import type { InpaintRequestBody, InpaintResponseBody } from "../types/api.types";

export function runInpaint(body: InpaintRequestBody): Promise<InpaintResponseBody> {
  return httpJson<InpaintResponseBody>("/api/inpaint", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
