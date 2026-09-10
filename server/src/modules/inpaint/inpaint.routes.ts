import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import { createInpaintProvider, InpaintService } from "./inpaint.service.js";
import type { InpaintRequestDto } from "./inpaint.service.js";

export async function registerInpaintRoutes(app: FastifyInstance): Promise<void> {
  const service = new InpaintService(createInpaintProvider());

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
