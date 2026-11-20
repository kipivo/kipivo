import { oc } from "@orpc/contract";
import { z } from "zod";
import { trustedOrigin } from "./policies";
import { restRoute } from "./rest";

export const setupContract = {
  get: oc
    .errors({ SERVICE_UNAVAILABLE: {} })
    .meta(...restRoute({ method: "GET", path: "/setup", summary: "Check installation status" }))
    .output(z.object({ open: z.boolean() })),
  create: trustedOrigin
    .errors({
      SERVICE_UNAVAILABLE: {},
      FORBIDDEN: {},
      SETUP_CLOSED: { message: "Installation is closed." },
    })
    .meta(
      ...restRoute({
        method: "POST",
        path: "/setup",
        summary: "Create the first administrator",
      }),
    )
    .input(
      z.strictObject({
        name: z.string().trim().min(1).max(128),
        email: z.email().max(254),
        password: z.string().min(12).max(128),
      }),
    )
    .output(z.object({ ok: z.literal(true) })),
};
