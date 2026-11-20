import { currentAccount } from "./accounts/schemas";
import { accountProfile } from "@kipivo/account";
import { oc } from "@orpc/contract";
import { z } from "zod";

const auth = oc.errors({
  BAD_REQUEST: {},
  UNAUTHORIZED: {},
  FORBIDDEN: {},
  NOT_FOUND: {},
  CONFLICT: {},
  UNPROCESSABLE_CONTENT: {},
  TOO_MANY_REQUESTS: {},
  SERVICE_UNAVAILABLE: {},
});

export const authContract = {
  session: {
    get: auth.input(z.object({ includeAccount: z.boolean().optional() }).optional()).output(
      z
        .object({
          user: accountProfile,
          session: z.object({ id: z.string(), expiresAt: z.string() }),
          account: currentAccount.optional(),
        })
        .nullable(),
    ),
  },
};
