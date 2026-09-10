import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerCacheRoutes } from "./modules/cache/cache.routes.js";
import { registerFolderRoutes } from "./modules/folder/folder.routes.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerInpaintRoutes } from "./modules/inpaint/inpaint.routes.js";

export async function buildApp(options: {
  toolId: string;
  port: number;
  serveWeb: boolean;
}) {
  const app = Fastify({
    logger: true,
    bodyLimit: 40 * 1024 * 1024,
  });

  await app.register(cors, { origin: true });
  await registerHealthRoutes(app, { toolId: options.toolId, port: options.port });
  await registerInpaintRoutes(app);
  await registerCacheRoutes(app);
  await registerFolderRoutes(app);

  if (options.serveWeb) {
    const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
    if (existsSync(webRoot)) {
      await app.register(fastifyStatic, { root: webRoot, prefix: "/" });
      app.setNotFoundHandler((req, reply) => {
        if (req.url.startsWith("/api")) {
          return reply.code(404).send({ error: "Not found" });
        }
        return reply.sendFile("index.html", webRoot);
      });
    }
  }

  return app;
}
