import type { FastifyInstance } from "fastify";

export async function registerHealth(app: FastifyInstance, version: string): Promise<void> {
  app.get("/health", async () => ({
    status: "ok" as const,
    version,
  }));
}
