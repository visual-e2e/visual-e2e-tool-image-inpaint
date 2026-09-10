import { buildApp } from "./app.js";

const port = Number(process.env.TOOL_PORT ?? "3204");
const host = "127.0.0.1";
const serveWeb = process.env.SERVE_WEB === "1";
const toolId = process.env.TOOL_ID ?? "image-inpaint";

const app = await buildApp({ toolId, port, serveWeb });
await app.listen({ port, host });
console.log(`[${toolId}] http://${host}:${port}`);
