import type { EvlogOrpcContext } from "@kipivo/logger/orpc";

type ProductEvent =
  | "install.completed"
  | "settings.personal_saved"
  | "settings.email_saved"
  | "settings.directory_saved"
  | "account.role_set";

export function recordProductEvent(log: EvlogOrpcContext["log"], event: ProductEvent) {
  log?.set({ telemetry: { event } });
}
