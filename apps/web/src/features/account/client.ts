import type { ApiClient } from "@kipivo/contract";
export { errorStatus } from "@kipivo/orpc/errors";

export type CurrentAccount = Awaited<ReturnType<ApiClient["accounts"]["me"]["get"]>>;
export type AccountPage = Awaited<ReturnType<ApiClient["admin"]["accounts"]["list"]>>;
export type ListedAccount = AccountPage["items"][number];

let client: ApiClient | undefined;

export async function accountClient() {
  if (client) return client;
  const { createApiClient } = await import("@kipivo/orpc/client");
  return (client ??= createApiClient(window.location.origin));
}
