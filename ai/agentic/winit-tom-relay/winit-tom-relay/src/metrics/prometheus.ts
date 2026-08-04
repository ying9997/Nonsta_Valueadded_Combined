import { Counter, Registry, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register });

const httpRequests = new Counter({
  name: "relay_http_requests_total",
  help: "Relay HTTP requests by route and tenant label",
  labelNames: ["route", "tenant"],
  registers: [register],
});

export function recordHttpRequest(route: string, tenantLabel: string): void {
  httpRequests.inc({ route, tenant: tenantLabel });
}

export async function getMetricsText(): Promise<string> {
  return register.metrics();
}
