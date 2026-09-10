import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import { CacheService } from "./cache.service.js";

export async function registerCacheRoutes(app: FastifyInstance): Promise<void> {
  const service = new CacheService();

  app.post<{
    Body: {
      cacheRoot: string;
      session: unknown;
      files?: Array<{ relativePath: string; base64: string }>;
    };
  }>("/api/cache/save", async (req, reply) => {
    try {
      return await service.save(req.body);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.message, code: err.code });
      }
      return reply.code(500).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post<{ Body: { cacheRoot: string } }>("/api/cache/load", async (req, reply) => {
    try {
      return await service.load(req.body.cacheRoot);
    } catch (err) {
      return reply.code(500).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post<{
    Body: { cacheRoot: string; relativePath: string };
  }>("/api/cache/file", async (req, reply) => {
    try {
      return await service.readFileBase64(req.body.cacheRoot, req.body.relativePath);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.message, code: err.code });
      }
      return reply.code(500).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
