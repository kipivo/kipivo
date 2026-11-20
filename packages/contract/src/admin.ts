import { accountId } from "@kipivo/account";
import { directoryListInput, directorySettings } from "@kipivo/admin/directory";
import { emailSettings, emailSettingsInput } from "@kipivo/email/settings";
import { z } from "zod";
import { account, accountRole } from "./accounts/schemas";
import { sessionRead, trustedWrite } from "./policies";
import { restRoute } from "./rest";

export const adminContract = {
  accounts: {
    list: sessionRead
      .meta(
        ...restRoute({
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
          ...restRoute({
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
          ...restRoute({
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
          ...restRoute({
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
          ...restRoute({
            method: "GET",
            path: "/admin/settings/directory",
            summary: "Read instance directory settings",
          }),
        )
        .output(directorySettings),
      update: trustedWrite
        .meta(
          ...restRoute({
            method: "PUT",
            path: "/admin/settings/directory",
            summary: "Save instance directory settings",
          }),
        )
        .input(directorySettings)
        .output(directorySettings),
    },
  },
};
