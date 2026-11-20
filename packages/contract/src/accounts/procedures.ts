import { personalSettings } from "@kipivo/account/settings";
import { sessionRead, trustedWrite } from "../policies";
import { restRoute } from "../rest";
import { currentAccount } from "./schemas";

export const accountsContract = {
  me: {
    get: sessionRead
      .meta(
        ...restRoute({
          method: "GET",
          path: "/accounts/me",
          summary: "Get the signed-in account and its permissions",
        }),
      )
      .output(currentAccount),
    settings: {
      get: sessionRead
        .meta(
          ...restRoute({
            method: "GET",
            path: "/accounts/me/settings",
            summary: "Read your personal settings",
          }),
        )
        .output(personalSettings),
      update: trustedWrite
        .meta(
          ...restRoute({
            method: "PUT",
            path: "/accounts/me/settings",
            summary: "Save your personal settings",
          }),
        )
        .input(personalSettings)
        .output(personalSettings),
    },
  },
};
