export type ConnectionResult =
  | { status: "reachable" | "unreachable" | "unexpected-response" | "timeout" | "cancelled" }
  | { status: "http-error"; code: number };

type PingFetch = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, "status" | "headers" | "json">>;

async function ping(
  origin: string,
  request: PingFetch,
  signal: AbortSignal,
): Promise<ConnectionResult> {
  let response;
  try {
    response = await request(`${origin}/api/v1/system/ping`, {
      method: "GET",
      credentials: "omit",
      redirect: "manual",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal,
    });
  } catch {
    return { status: "unreachable" };
  }

  if (response.status !== 200) return { status: "http-error", code: response.status };
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return { status: "unexpected-response" };

  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "ok" in body && body.ok === true) {
      return { status: "reachable" };
    }
  } catch {
    // A reachable server can still return malformed JSON.
  }
  return { status: "unexpected-response" };
}

export function checkConnection(
  origin: string,
  request: PingFetch,
  { signal, timeoutMs = 5_000 }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<ConnectionResult> {
  if (signal?.aborted) return Promise.resolve({ status: "cancelled" });

  return new Promise((resolve) => {
    const controller = new AbortController();
    const stop = (status: "cancelled" | "timeout") => {
      finish({ status });
      controller.abort();
    };
    const cancel = () => stop("cancelled");
    const timer = setTimeout(() => stop("timeout"), timeoutMs);
    function finish(result: ConnectionResult) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      resolve(result);
    }

    signal?.addEventListener("abort", cancel, { once: true });
    void ping(origin, request, controller.signal).then(finish);
  });
}
