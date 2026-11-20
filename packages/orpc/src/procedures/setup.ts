import type { SetupService } from "@kipivo/core/setup";
import { api, requireService } from "./builders";
import { recordProductEvent } from "./telemetry";

export function createSetupProcedures(service?: SetupService) {
  const { setup } = api;

  return setup.router({
    get: setup.get.handler(async ({ errors }) => {
      const open = await requireService(service, errors).isOpen();
      if (open === undefined) throw errors.SERVICE_UNAVAILABLE();
      return { open };
    }),
    create: setup.create.handler(async ({ context: { trustedOrigin, log }, input, errors }) => {
      const installer = requireService(service, errors);
      if (!trustedOrigin) throw errors.FORBIDDEN();
      const result = await installer.install(input);
      if (result === "closed") throw errors.SETUP_CLOSED();
      if (result === "unavailable") throw errors.SERVICE_UNAVAILABLE();
      recordProductEvent(log, "install.completed");
      return { ok: true };
    }),
  });
}
