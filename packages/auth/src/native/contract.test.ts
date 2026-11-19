import { expect, it } from "vitest";
import { readNativeCode } from "./contract";

const pending = { client_id: "expo", state: "this-is-the-pending-state" } as const;
const code = "a".repeat(43);
const callback = `kipivo://auth/callback?state=${pending.state}&code=${code}`;

it("accepts the pending app callback, independent of query order", () => {
  expect(readNativeCode(callback, pending)).toBe(code);
});

it.each([
  callback.replace("kipivo:", "kipivo-desktop:"),
  callback.replace("/callback?", "/callback/extra?"),
  callback.replace(pending.state, "a-previous-attempt-state"),
  callback.replace(code, "invalid"),
  `${callback}&state=${pending.state}`,
  `${callback}&code=${code}`,
  `${callback}#fragment`,
])("discards callbacks that do not match the pending login: %s", (url) => {
  expect(readNativeCode(url, pending)).toBeNull();
});
