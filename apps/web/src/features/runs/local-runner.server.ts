import "@tanstack/react-start/server-only";
import { requestRunner } from "@kipivo/runtime/local/connection";
import { runId, submitCheck } from "@kipivo/contracts/runs";

const noStore = { "Cache-Control": "no-store" };
const error = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers: noStore });

export async function proxyRuns(request: Request, id?: string) {
  if (!import.meta.env.DEV) return error("not found", 404);
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    return error("not found", 404);
  }
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || (request.method === "POST" && origin !== url.origin)) {
    return error("same-origin request required", 403);
  }
  const init: RequestInit = { method: request.method };
  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return error("invalid check", 400);
    }
    const body = submitCheck.safeParse(await request.json().catch(() => null));
    if (!body.success) return error("invalid check", 400);
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body.data);
  }
  if (id !== undefined && !runId.safeParse(id).success) return error("not found", 404);
  try {
    const response = await requestRunner(id === undefined ? "/v1/runs" : `/v1/runs/${id}`, init);
    if (response.status === 401) return error("local runner unavailable", 503);
    return new Response(response.body, {
      status: response.status,
      headers: { ...noStore, "Content-Type": "application/json" },
    });
  } catch {
    return error("Local runner unavailable. Start it with kipivo serve.", 503);
  }
}
