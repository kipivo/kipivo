import type { AccessService } from "@kipivo/core/access";
import type { EmailSettingsAccess, SettingsAccess } from "@kipivo/core/settings";
import { readAccountResult } from "./errors";
import { createSignedIn } from "./builders";
import { recordProductEvent } from "./telemetry";

export function createAdminProcedures(
  accounts: Pick<AccessService, "list" | "changeRole"> | undefined,
  settings: Pick<SettingsAccess, "directory" | "saveDirectory"> | undefined,
  email: EmailSettingsAccess | undefined,
) {
  const directoryAccounts = createSignedIn(accounts).admin.accounts;
  const directorySettings = createSignedIn(settings).admin.settings.directory;
  const emailSettings = createSignedIn(email).admin.settings.email;

  return {
    accounts: {
      list: directoryAccounts.list.handler(
        async ({ context: { actorId, service }, input, errors }) =>
          readAccountResult(await service.list(actorId, input), errors),
      ),
      role: {
        update: directoryAccounts.role.update.handler(
          async ({ context: { actorId, log, service }, input, errors }) => {
            const result = await service.changeRole(actorId, input);
            if (result.status === "not_found") throw errors.NOT_FOUND();
            const account = readAccountResult(result, errors);
            log?.set({ access: { actorId, targetId: input.id, role: input.role } });
            recordProductEvent(log, "account.role_set");
            return account;
          },
        ),
      },
    },
    settings: {
      email: {
        get: emailSettings.get.handler(async ({ context: { actorId, service }, errors }) =>
          readAccountResult(await service.get(actorId), errors),
        ),
        update: emailSettings.update.handler(
          async ({ context: { actorId, log, service }, input, errors }) => {
            const value = readAccountResult(await service.save(actorId, input), errors);
            if (!value) throw errors.BAD_REQUEST();
            recordProductEvent(log, "settings.email_saved");
            return value;
          },
        ),
      },
      directory: {
        get: directorySettings.get.handler(async ({ context: { actorId, service }, errors }) =>
          readAccountResult(await service.directory(actorId), errors),
        ),
        update: directorySettings.update.handler(
          async ({ context: { actorId, log, service }, input, errors }) => {
            const value = readAccountResult(await service.saveDirectory(actorId, input), errors);
            recordProductEvent(log, "settings.directory_saved");
            return value;
          },
        ),
      },
    },
  };
}
