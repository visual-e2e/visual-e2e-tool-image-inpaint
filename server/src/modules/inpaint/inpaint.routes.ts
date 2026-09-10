import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createInpaintProvider,
  InpaintService,
} from "./inpaint.service.js";
import type { InpaintRequestDto } from "./inpaint.service.js";
import {
  clearPersistedSettings,
  loadPersistedSettings,
  resolveEffectiveSettings,
  savePersistedSettings,
} from "./inpaint-settings.service.js";

export async function registerInpaintRoutes(app: FastifyInstance): Promise<void> {
  const service = new InpaintService(await createInpaintProvider());

  app.get("/api/inpaint/config", async () => {
    const effective = await resolveEffectiveSettings();
    const persisted = await loadPersistedSettings();
    const envConfigured = Boolean(process.env.INPAINT_API_URL?.trim());
    return {
      configured: Boolean(effective?.apiUrl),
      apiUrl: effective?.apiUrl ?? null,
      hasApiKey: Boolean(effective?.apiKey),
      provider: service.getProviderName(),
      source: persisted?.apiUrl
        ? "persisted"
        : envConfigured
          ? "env"
          : "none",
    };
  });

  app.put<{
    Body: { apiUrl?: string; apiKey?: string; clear?: boolean };
  }>("/api/inpaint/config", async (req, reply) => {
    try {
      if (req.body?.clear) {
        await clearPersistedSettings();
        const fallback = await resolveEffectiveSettings();
        await service.applySettings(fallback);
        return {
          ok: true,
          configured: Boolean(fallback?.apiUrl),
          apiUrl: fallback?.apiUrl ?? null,
          hasApiKey: Boolean(fallback?.apiKey),
          provider: service.getProviderName(),
          source: fallback?.apiUrl && process.env.INPAINT_API_URL?.trim()
            ? "env"
            : "none",
        };
      }

      const apiUrl = req.body?.apiUrl?.trim() ?? "";
      if (!apiUrl) {
        return reply.code(400).send({ error: "apiUrl 不能为空", code: "invalid_config" });
      }

      const existing = await loadPersistedSettings();
      const apiKeyProvided = typeof req.body?.apiKey === "string";
      const saved = await savePersistedSettings({
        apiUrl,
        apiKey: apiKeyProvided
          ? req.body.apiKey
          : existing?.apiKey,
      });
      await service.applySettings(saved);
      return {
        ok: true,
        configured: true,
        apiUrl: saved.apiUrl,
        hasApiKey: Boolean(saved.apiKey),
        provider: service.getProviderName(),
        source: "persisted",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({ error: message, code: "invalid_config" });
    }
  });

  app.post<{
    Body: { apiUrl?: string; apiKey?: string };
  }>("/api/inpaint/config/test", async (req, reply) => {
    const apiUrl = req.body?.apiUrl?.trim()
      || (await resolveEffectiveSettings())?.apiUrl
      || "";
    if (!apiUrl) {
      return reply.code(400).send({
        error: "请先填写 apiUrl",
        code: "invalid_config",
        ok: false,
      });
    }
    const result = await service.testConnection({
      apiUrl,
      apiKey: req.body?.apiKey?.trim()
        || (await resolveEffectiveSettings())?.apiKey,
    });
    return result;
  });

  app.post<{ Body: InpaintRequestDto }>("/api/inpaint", async (req, reply) => {
    try {
      return await service.run(req.body);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.message, code: err.code });
      }
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: message, code: "unknown" });
    }
  });
}
