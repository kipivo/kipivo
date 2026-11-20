import type { CurrentAccountQuery } from "@kipivo/core/access";
import type { SettingsAccess } from "@kipivo/core/settings";
import { createSignedIn } from "./builders";
import { readAccountResult } from "./errors";
import { recordProductEvent } from "./telemetry";

export function createAccountProcedures(
  currentAccount: CurrentAccountQuery | undefined,
  settings: Pick<SettingsAccess, "personal" | "savePersonal"> | undefined,
) {
  const account = createSignedIn(currentAccount).accounts.me;
  const personal = createSignedIn(settings).accounts.me.settings;

  return {
    me: {
      get: account.get.handler(async ({ context: { actorId, service }, errors }) =>
        readAccountResult(await service(actorId), errors),
      ),
      settings: {
        get: personal.get.handler(({ context: { actorId, service } }) => service.personal(actorId)),
        update: personal.update.handler(async ({ context: { actorId, log, service }, input }) => {
          const value = await service.savePersonal(actorId, input);
          recordProductEvent(log, "settings.personal_saved");
          return value;
        }),
      },
    },
  };
}
