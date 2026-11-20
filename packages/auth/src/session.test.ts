import { APIError } from "better-auth/api";
import { kAPIErrorHeaderSymbol } from "better-call/error";
import { expect, it, vi } from "vitest";
import { createRequestIdentity, SessionReadError } from "./session";

const snapshot = {
  user: { id: "account", name: "Kipivo", email: "user@example.com" },
  session: { id: "session", expiresAt: new Date("2027-01-01") },
};
const cookie = "kipivo.session_token=; Max-Age=0";
const cookieWithExpiry = "kipivo.session_data=; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

it("lazily memoizes each mode per request and projects the public session fields", async () => {
  const request = new Headers({ cookie: "kipivo.session_token=token" });
  const outgoing = new Headers();
  const response = { ...snapshot, session: { ...snapshot.session, token: "private" } };
  const getSession = vi
    .fn()
    .mockResolvedValueOnce({ headers: new Headers({ "set-cookie": cookie }), response: null })
    .mockResolvedValueOnce({ headers: new Headers({ "set-cookie": cookieWithExpiry }), response });
  const identity = createRequestIdentity({ api: { getSession } }, request, outgoing);

  expect(getSession).not.toHaveBeenCalled();
  const actorId = identity.getActorId();
  expect(identity.getActorId()).toBe(actorId);
  expect(await actorId).toBeUndefined();
  const session = identity.readSession();
  expect(identity.readSession()).toBe(session);
  expect(await session).toEqual(snapshot);
  expect(getSession.mock.calls).toEqual([
    [{ headers: request, returnHeaders: true, query: { disableRefresh: true } }],
    [{ headers: request, returnHeaders: true }],
  ]);
  expect(outgoing.getSetCookie()).toEqual([cookie, cookieWithExpiry]);
});

it("keeps endpoint error cookies and retry timing even when a failed read is repeated", async () => {
  const outgoing = new Headers();
  const endpointHeaders = new Headers({ "retry-after": "30", location: "/sign-in" });
  endpointHeaders.append("set-cookie", cookie);
  endpointHeaders.append("set-cookie", cookieWithExpiry);
  const failure = new APIError("TOO_MANY_REQUESTS");
  Object.defineProperty(failure, kAPIErrorHeaderSymbol, { value: endpointHeaders });
  const getSession = vi.fn().mockRejectedValue(failure);
  const identity = createRequestIdentity({ api: { getSession } }, new Headers(), outgoing);

  const session = identity.readSession();
  expect(identity.readSession()).toBe(session);
  await expect(session).rejects.toBeInstanceOf(SessionReadError);
  await expect(session).rejects.toMatchObject({ status: 429, cause: failure });
  expect(getSession).toHaveBeenCalledTimes(1);
  expect(outgoing.getSetCookie()).toEqual([cookie, cookieWithExpiry]);
  expect(outgoing.get("retry-after")).toBe("30");
  expect(outgoing.has("location")).toBe(false);
});

it("propagates unknown errors from the session source", async () => {
  const failure = new Error("Session source failed");
  const getSession = vi.fn().mockRejectedValue(failure);
  const identity = createRequestIdentity({ api: { getSession } }, new Headers(), new Headers());

  await expect(identity.getActorId()).rejects.toBe(failure);
});
