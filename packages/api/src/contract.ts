import { emailSettings, emailSettingsInput } from "@kipivo/email/settings";
import { originHeader, sessionRequired } from "./security";
import { authContract } from "./auth";
import { accountId, accountProfile } from "@kipivo/account";
import { personalSettings } from "@kipivo/account/settings";
import { directoryListInput, directorySettings } from "@kipivo/admin/directory";
import { accountRoles, permissions } from "@kipivo/rbac";
import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";

const role = z.enum(accountRoles);
const account = accountProfile.extend({ role });

const sessionRead = oc
  .$meta<{ requiresTrustedOrigin: boolean }>({ requiresTrustedOrigin: false })
  .$route({ spec: sessionRequired })
  .errors({
    UNAUTHORIZED: { message: "Sign in to continue." },
    FORBIDDEN: { message: "This action is not permitted." },
    SERVICE_UNAVAILABLE: { message: "Account service is unavailable." },
  });

const trustedWrite = sessionRead.meta({ requiresTrustedOrigin: true }).route({
  spec: (operation) => ({
    ...sessionRequired(operation),
    parameters: [...(operation.parameters ?? []), originHeader],
  }),
});

const publicContract = {
  setup: {
    status: oc
      .errors({ SERVICE_UNAVAILABLE: {} })
      .route({ method: "GET", path: "/setup/status", summary: "Check installation status" })
      .output(z.object({ open: z.boolean() })),
    install: oc
      .errors({
        SERVICE_UNAVAILABLE: {},
        FORBIDDEN: {},
        SETUP_CLOSED: { status: 409, message: "Installation is closed." },
      })
      .route({
        method: "POST",
        path: "/setup/install",
        summary: "Create the first administrator",
        spec: (operation) => ({
          ...operation,
          parameters: [...(operation.parameters ?? []), originHeader],
        }),
      })
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
      .route({ method: "GET", path: "/system/ping", summary: "Check API connectivity" })
      .output(z.object({ ok: z.literal(true) })),
  },
};

export const sessionContract = {
  account: {
    me: sessionRead
      .route({
        method: "GET",
        path: "/account/me",
        summary: "Get the signed-in account and its permissions",
      })
      .output(
        account.extend({ settings: personalSettings, permissions: z.array(z.enum(permissions)) }),
      ),
  },
  settings: {
    personal: sessionRead
      .route({ method: "GET", path: "/settings/personal", summary: "Read your personal settings" })
      .output(personalSettings),
    savePersonal: trustedWrite
      .route({ method: "PUT", path: "/settings/personal", summary: "Save your personal settings" })
      .input(personalSettings)
      .output(personalSettings),
    email: sessionRead
      .route({
        method: "GET",
        path: "/admin/settings/email",
        summary: "Read redacted email delivery settings",
      })
      .output(emailSettings),
    saveEmail: trustedWrite
      .errors({ BAD_REQUEST: { message: "An enabled sender requires an address and API key." } })
      .route({
        method: "PUT",
        path: "/admin/settings/email",
        summary: "Configure instance email delivery",
      })
      .input(emailSettingsInput)
      .output(emailSettings),
    directory: sessionRead
      .route({
        method: "GET",
        path: "/admin/settings/directory",
        summary: "Read instance directory settings",
      })
      .output(directorySettings),
    saveDirectory: trustedWrite
      .route({
        method: "PUT",
        path: "/admin/settings/directory",
        summary: "Save instance directory settings",
      })
      .input(directorySettings)
      .output(directorySettings),
  },
  admin: {
    accounts: {
      list: sessionRead
        .route({
          method: "GET",
          path: "/admin/accounts",
          summary: "List accounts",
          description:
            "Filter by a name or email substring. Use nextCursor with the same query for the next page.",
        })
        .input(directoryListInput)
        .output(z.object({ items: z.array(account), nextCursor: accountId.nullable() })),
      setRole: trustedWrite
        .route({
          method: "PUT",
          path: "/admin/accounts/{id}/role",
          summary: "Set another account's role",
          description: "Requires the trusted Web Origin and forbids changing your own role.",
        })
        .errors({ NOT_FOUND: { message: "Account not found." } })
        .input(z.object({ id: accountId, role }))
        .output(account),
    },
  },
};

export const contract = { auth: authContract, ...publicContract, ...sessionContract };

export type ApiClient = ContractRouterClient<typeof contract>;
