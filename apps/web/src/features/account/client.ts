import type { ApiClient } from "@kipivo/api/contract";

export type CurrentAccount = Awaited<ReturnType<ApiClient["account"]["me"]>>;
export type AccountPage = Awaited<ReturnType<ApiClient["admin"]["accounts"]["list"]>>;
export type ListedAccount = AccountPage["items"][number];

let client: ApiClient | undefined;

export async function accountClient() {
  if (client) return client;
  const { createApiClient } = await import("@kipivo/api/client");
  return (client ??= createApiClient(window.location.origin));
}

export function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    return error.status;
  }
}
