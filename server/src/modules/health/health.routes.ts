import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(
  app: FastifyInstance,
  meta: { toolId: string; port: number },
): Promise<void> {
  app.get("/api/health", async () => ({
    ok: true,
    toolId: meta.toolId,
    name: "AI Watermark Remover",
    version: "1.0.0",
    port: meta.port,
  }));

  app.get("/api/info", async () => ({
    id: meta.toolId,
    name: "AI Watermark Remover",
    description: "AI 去水印：支持批量、ZIP、选区复用与 RPC 缓存。",
    version: "1.0.0",
  }));
}
