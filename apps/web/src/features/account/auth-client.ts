import { installationRequired } from "@kipivo/auth/errors";

class AuthRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code?: typeof installationRequired,
  ) {
    super(`Authentication request failed (${status}).`);
  }
}

export function authErrorStatus(error: unknown) {
  return error instanceof AuthRequestError ? error.status : undefined;
}

export function authErrorCode(error: unknown) {
  return error instanceof AuthRequestError ? error.code : undefined;
}

export async function authRequest(
  path: `/${string}`,
  { body, signal }: { body?: object; signal?: AbortSignal } = {},
) {
  const response = await fetch(`/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (response.ok) return response;
  if (response.status === 409) {
    const details: unknown = await response.json().catch(() => undefined);
    if (
      details &&
      typeof details === "object" &&
      "code" in details &&
      details.code === installationRequired
    ) {
      throw new AuthRequestError(response.status, installationRequired);
    }
  }
  throw new AuthRequestError(response.status);
}
