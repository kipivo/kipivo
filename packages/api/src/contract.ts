import { emailSettings, emailSettingsInput } from "@kipivo/email/settings";
import { account, accountRole, currentAccount } from "./account";
import { originRequired, requireTrustedOrigin, sessionRequired } from "./security";
import { authContract } from "./auth";
import { accountId } from "@kipivo/account";
import { personalSettings } from "@kipivo/account/settings";
import { directoryListInput, directorySettings } from "@kipivo/admin/directory";
import { oc, type RouterContractClient } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const sessionRead = oc.meta(openapi.spec(sessionRequired)).errors({
  UNAUTHORIZED: { message: "Sign in to continue." },
  FORBIDDEN: { message: "This action is not permitted." },
  SERVICE_UNAVAILABLE: { message: "Account service is unavailable." },
});

const trustedWrite = sessionRead
  .meta(requireTrustedOrigin(true))
  .meta(openapi.spec(originRequired));

const publicContract = {
  setup: {
    get: oc
      .errors({ SERVICE_UNAVAILABLE: {} })
      .meta(openapi({ method: "GET", path: "/setup", summary: "Check installation status" }))
      .output(z.object({ open: z.boolean() })),
    create: oc
      .errors({
        SERVICE_UNAVAILABLE: {},
        FORBIDDEN: {},
        SETUP_CLOSED: { message: "Installation is closed." },
      })
      .meta(
        openapi({
          method: "POST",
          path: "/setup",
          summary: "Create the first administrator",
          spec: originRequired,
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
  },
  system: {
    ping: oc
      .meta(openapi({ method: "GET", path: "/system/ping", summary: "Check API connectivity" }))
      .output(z.object({ ok: z.literal(true) })),
  },
};

export const sessionContract = {
  accounts: {
    me: {
      get: sessionRead
        .meta(
          openapi({
            method: "GET",
            path: "/accounts/me",
            summary: "Get the signed-in account and its permissions",
          }),
        )
        .output(currentAccount),
      settings: {
        get: sessionRead
          .meta(
            openapi({
              method: "GET",
              path: "/accounts/me/settings",
              summary: "Read your personal settings",
            }),
          )
          .output(personalSettings),
        update: trustedWrite
          .meta(
            openapi({
              method: "PUT",
              path: "/accounts/me/settings",
              summary: "Save your personal settings",
            }),
          )
          .input(personalSettings)
          .output(personalSettings),
      },
    },
  },
  admin: {
    accounts: {
      list: sessionRead
        .meta(
          openapi({
            method: "GET",
            path: "/admin/accounts",
            summary: "List accounts",
            description:
              "Filter by a name or email substring. Use nextCursor with the same query for the next page.",
          }),
        )
        .input(directoryListInput)
        .output(z.object({ items: z.array(account), nextCursor: accountId.nullable() })),
      role: {
        update: trustedWrite
          .meta(
            openapi({
              method: "PUT",
              path: "/admin/accounts/{id}/role",
              summary: "Set another account's role",
              description: "Requires the trusted Web Origin and forbids changing your own role.",
            }),
          )
          .errors({ NOT_FOUND: { message: "Account not found." } })
          .input(z.object({ id: accountId, role: accountRole }))
          .output(account),
      },
    },
    settings: {
      email: {
        get: sessionRead
          .meta(
            openapi({
              method: "GET",
              path: "/admin/settings/email",
              summary: "Read redacted email delivery settings",
            }),
          )
          .output(emailSettings),
        update: trustedWrite
          .errors({
            BAD_REQUEST: { message: "An enabled sender requires an address and API key." },
          })
          .meta(
            openapi({
              method: "PUT",
              path: "/admin/settings/email",
              summary: "Configure instance email delivery",
            }),
          )
          .input(emailSettingsInput)
          .output(emailSettings),
      },
      directory: {
        get: sessionRead
          .meta(
            openapi({
              method: "GET",
              path: "/admin/settings/directory",
              summary: "Read instance directory settings",
            }),
          )
          .output(directorySettings),
        update: trustedWrite
          .meta(
            openapi({
              method: "PUT",
              path: "/admin/settings/directory",
              summary: "Save instance directory settings",
            }),
          )
          .input(directorySettings)
          .output(directorySettings),
      },
    },
  },
};

export const contract = { auth: authContract, ...publicContract, ...sessionContract };

export type ApiClient = RouterContractClient<typeof contract>;
export { requiresTrustedOrigin } from "./security";
