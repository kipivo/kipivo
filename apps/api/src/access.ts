import type { createEmailRepository } from "@kipivo/db/email";
import type { SettingsRepository } from "@kipivo/db/factory";
import type { AccessService } from "@kipivo/core/access";
import type { ApiClient } from "@kipivo/api/contract";

export interface RequestAccess {
  accounts: AccessService;
  settings: SettingsRepository;
  email: Pick<ReturnType<typeof createEmailRepository>, "get" | "save">;
  setup: {
    isOpen(): Promise<boolean | undefined>;
    install(
      input: Parameters<ApiClient["setup"]["install"]>[0],
    ): Promise<"ok" | "closed" | "unavailable">;
  };
  getActorId(headers: Headers): Promise<string | undefined>;
  trustedOrigin: string;
}

type AccessErrors = Record<"UNAUTHORIZED" | "FORBIDDEN" | "SERVICE_UNAVAILABLE", () => Error>;

export function readAccountResult<T>(
  result: { status: "ok"; value: T } | { status: "unauthorized" | "forbidden" },
  errors: AccessErrors,
): T {
  if (result.status === "ok") return result.value;
  throw result.status === "unauthorized" ? errors.UNAUTHORIZED() : errors.FORBIDDEN();
}
