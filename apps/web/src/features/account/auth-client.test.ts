import { installationRequired } from "@kipivo/auth/errors";
import { afterEach, expect, test, vi } from "vitest";
import { authErrorCode, authErrorStatus, authRequest } from "./auth-client";

afterEach(() => vi.unstubAllGlobals());

test.each([
  [409, JSON.stringify({ code: installationRequired }), installationRequired],
  [409, JSON.stringify({ code: "OTHER_CONFLICT" }), undefined],
  [409, "<html>Server error</html>", undefined],
  [409, "null", undefined],
  [403, JSON.stringify({ code: installationRequired }), undefined],
])(
  "auth errors retain status %s and recognize only the setup conflict (%s)",
  async (status, body, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status })));

    await expect(authRequest("/sign-up/email", { body: {} })).rejects.toSatisfy(
      (error: unknown) => authErrorStatus(error) === status && authErrorCode(error) === code,
    );
  },
);

test("a successful auth request returns the original response with its readable body", async () => {
  const response = Response.json({ providers: ["github"] });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

  const result = await authRequest("/social-methods");
  expect(result).toBe(response);
  expect(await result.json()).toEqual({ providers: ["github"] });
});
