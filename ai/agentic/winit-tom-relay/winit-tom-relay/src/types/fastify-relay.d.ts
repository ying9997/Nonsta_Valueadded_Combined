import "fastify";
import type { RelayContext } from "../tenants/types.js";

declare module "fastify" {
  interface FastifyRequest {
    relay?: RelayContext;
  }
}
