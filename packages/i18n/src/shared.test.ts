import { expect, it } from "vitest";
import { m } from "@kipivo/i18n/messages";

// Shared packages consume the compiled entry, not an app alias or a private copy.
it("serves compiled messages through the package entry", () => {
  expect(m.signInHeading()).toBe("Sign in to Kipivo");
  expect(m.socialContinueWithProvider({ provider: "GitHub" })).toBe("Continue with GitHub");
});
