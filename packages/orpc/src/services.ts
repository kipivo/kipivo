import type { AccessService, CurrentAccountQuery } from "@kipivo/core/access";
import type { EmailSettingsAccess, SettingsAccess } from "@kipivo/core/settings";
import type { SetupService } from "@kipivo/core/setup";

export interface ProcedureServices {
  currentAccount: CurrentAccountQuery;
  accounts: Pick<AccessService, "list" | "changeRole">;
  settings: SettingsAccess;
  email: EmailSettingsAccess;
  setup: SetupService;
}
