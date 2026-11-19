import { createIsomorphicFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { accountClient } from "./client";
import { getInstallClient } from "./install-status.server";

// SSR uses the private upstream; client-side navigation calls the same-origin oRPC endpoint.
const installClient = createIsomorphicFn().server(getInstallClient).client(accountClient);

export async function readInstallStatus() {
  try {
    const api = await installClient();
    if (api) return (await api.setup.status(undefined, { signal: AbortSignal.timeout(2500) })).open;
  } catch {
    // An unreachable API is not evidence of a new installation.
  }
  return null;
}

export async function requireInstallation() {
  if (await readInstallStatus()) throw redirect({ to: "/setup", replace: true });
}
