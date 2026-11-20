import { createCurrentAccountQuery, type AccessService } from "@kipivo/core/access";
import { createRequestIdentity } from "@kipivo/auth/session";
import { configureLogger } from "@kipivo/logger";
import type { ProcedureServices } from "@kipivo/orpc";
import { APIError, kAPIErrorHeaderSymbol } from "better-call/error";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { Authentication } from "../runtime/services";

const trustedOrigin = "https://app.example";
const wrongOrigin = "https://other.example";
const sessionCookie = "kipivo.session_token=test-session";
const actorId = "signed-in-account";
const administrator = { name: "First", email: "first@example.com", password: "example-password" };
const personalSettings = { menuLabel: "name" } as const;
const emailSettingsInput = {
  enabled: true,
  from: "sender@example.com",
  apiKey: "fixture-key-only",
};
const directorySettings = { pageSize: 10 };
const roleChange = { id: "other-account", role: "admin" } as const;

function jsonRequest(path: string, method: string, body: object) {
  return new Request(new URL(path, trustedOrigin), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rpc(path: string, input?: object) {
  return jsonRequest(`/rpc${path}`, "POST", { json: input });
}

function restRead(path: string) {
  return new Request(new URL(`/api/v1${path}`, trustedOrigin));
}

const requests = {
  RPC: {
    email: () => rpc("/admin/settings/email/get"),
    saveEmail: () => rpc("/admin/settings/email/update", emailSettingsInput),
    personal: () => rpc("/accounts/me/settings/get"),
    directory: () => rpc("/admin/settings/directory/get"),
    savePersonal: (input: object = personalSettings) => rpc("/accounts/me/settings/update", input),
    saveDirectory: () => rpc("/admin/settings/directory/update", directorySettings),
    ping: () => rpc("/system/ping"),
    me: () => rpc("/accounts/me/get"),
    status: () => rpc("/setup/get"),
    list: () => rpc("/admin/accounts/list", {}),
    install: () => rpc("/setup/create", administrator),
    setRole: () => rpc("/admin/accounts/role/update", roleChange),
  },
  REST: {
    email: () => restRead("/admin/settings/email"),
    saveEmail: () => jsonRequest("/api/v1/admin/settings/email", "PUT", emailSettingsInput),
    personal: () => restRead("/accounts/me/settings"),
    directory: () => restRead("/admin/settings/directory"),
    savePersonal: (input: object = personalSettings) =>
      jsonRequest("/api/v1/accounts/me/settings", "PUT", input),
    saveDirectory: () => jsonRequest("/api/v1/admin/settings/directory", "PUT", directorySettings),
    ping: () => restRead("/system/ping"),
    me: () => restRead("/accounts/me"),
    status: () => restRead("/setup"),
    list: () => restRead("/admin/accounts"),
    install: () => jsonRequest("/api/v1/setup", "POST", administrator),
    setRole: () =>
      jsonRequest(`/api/v1/admin/accounts/${roleChange.id}/role`, "PUT", {
        role: roleChange.role,
      }),
  },
};

type AuthHandler = Authentication["handle"];
type GetSession = Parameters<typeof createRequestIdentity>[0]["api"]["getSession"];
const sessionSnapshot = {
  user: { id: actorId, name: "Test", email: "test@example.com" },
  session: { id: "session", expiresAt: new Date("2026-12-01T00:00:00.000Z") },
};

function stubAuthentication(handle: AuthHandler = async () => new Response(null, { status: 204 })) {
  const getSession = vi.fn<GetSession>(async ({ headers }) => ({
    headers: null,
    response: headers.get("cookie") === sessionCookie ? sessionSnapshot : null,
  }));
  return {
    getSession,
    authentication: {
      handle,
      identify: (headers: Headers, outgoing: Headers) =>
        createRequestIdentity({ api: { getSession } }, headers, outgoing),
      trustedOrigins: [trustedOrigin],
      cookiePrefix: "kipivo",
    },
  };
}

function stubProcedures() {
  const accounts = {
    getMe: vi.fn<AccessService["getMe"]>(),
    list: vi.fn<ProcedureServices["accounts"]["list"]>(),
    changeRole: vi.fn<ProcedureServices["accounts"]["changeRole"]>(),
  };
  const settings = {
    personal: vi.fn<ProcedureServices["settings"]["personal"]>(),
    savePersonal: vi.fn<ProcedureServices["settings"]["savePersonal"]>(),
    directory: vi.fn<ProcedureServices["settings"]["directory"]>(),
    saveDirectory: vi.fn<ProcedureServices["settings"]["saveDirectory"]>(),
  };
  return {
    currentAccount: createCurrentAccountQuery(accounts, settings),
    accounts,
    settings,
    email: { get: vi.fn(), save: vi.fn<ProcedureServices["email"]["save"]>() },
    setup: {
      isOpen: vi.fn<ProcedureServices["setup"]["isOpen"]>(),
      install: vi.fn<ProcedureServices["setup"]["install"]>(),
    },
  } satisfies ProcedureServices;
}

function stubApp() {
  const access = stubProcedures();
  const { authentication, getSession } = stubAuthentication();
  return { app: createApp({ procedures: access, authentication }), access, getSession };
}

function expectNoBusinessCalls(access: ReturnType<typeof stubProcedures>) {
  for (const operation of [
    ...Object.values(access.accounts),
    ...Object.values(access.setup),
    ...Object.values(access.settings),
    ...Object.values(access.email),
  ]) {
    expect(operation).not.toHaveBeenCalled();
  }
}

async function requestWithLog(app: ReturnType<typeof createApp>, request: Request) {
  const lines: string[] = [];
  const spies = (["info", "warn", "error"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation((line: string) => {
      lines.push(line);
    }),
  );
  try {
    const response = await app.request(request);
    expect(lines).toHaveLength(1);
    const log = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(log).toMatchObject({
      requestId: response.headers.get("x-request-id"),
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
    });
    return { response, log };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

function signedWrite(request: Request) {
  request.headers.set("Cookie", sessionCookie);
  request.headers.set("Origin", trustedOrigin);
  return request;
}

it.each(["/healthz", "/readyz", "/api/openapi.json"])(
  "%s is public without reading the session",
  async (path) => {
    const access = stubProcedures();
    const { authentication, getSession } = stubAuthentication();
    const app = createApp({ procedures: access, authentication, ready: async () => true });

    const response = await app.request(path, { headers: { Cookie: sessionCookie } });

    expect(response.status).toBe(200);
    expect(getSession).not.toHaveBeenCalled();
  },
);

it.each([
  { method: "GET", path: "/api/auth/get-session", origin: trustedOrigin },
  { method: "POST", path: "/api/auth/sign-out", origin: trustedOrigin },
  { method: "POST", path: "/api/auth/native/exchange", origin: undefined },
  { method: "GET", path: "/api/auth/callback/google", origin: wrongOrigin },
])(
  "delegates $method $path to authentication without reading the session",
  async ({ method, path, origin }) => {
    const handle = vi.fn(async (_request: Request) =>
      Response.json(
        { handledBy: "auth" },
        { status: 202, headers: { "Set-Cookie": sessionCookie } },
      ),
    );
    const { authentication, getSession } = stubAuthentication(handle);
    const app = createApp({ authentication });
    const headers = new Headers({ Cookie: sessionCookie });
    if (origin) headers.set("Origin", origin);

    const response = await app.request(path, { method, headers });

    expect(response.status).toBe(202);
    expect(response.headers.getSetCookie()).toEqual([sessionCookie]);
    expect(await response.json()).toEqual({ handledBy: "auth" });
    expect(handle).toHaveBeenCalledTimes(1);
    const [[request]] = handle.mock.calls;
    expect(request.method).toBe(method);
    expect(new URL(request.url).pathname).toBe(path);
    expect(request.headers.get("cookie")).toBe(sessionCookie);
    expect(request.headers.get("origin")).toBe(origin ?? null);
    expect(getSession).not.toHaveBeenCalled();
  },
);

it("refuses a browser auth write from an untrusted Origin", async () => {
  const handle = vi.fn<AuthHandler>();
  const { authentication } = stubAuthentication(handle);
  const response = await createApp({ authentication }).request("/api/auth/sign-out", {
    method: "POST",
    headers: { Origin: wrongOrigin, Cookie: sessionCookie },
  });

  expect(response.status).toBe(403);
  expect(handle).not.toHaveBeenCalled();
});

it("returns 503 when the auth handler is not configured", async () => {
  const response = await createApp().request("/api/auth/get-session");
  expect(response.status).toBe(503);
});

it.each([
  { trustProxy: true, address: "192.0.2.2" },
  { trustProxy: false, address: "192.0.2.1" },
])(
  "normalizes the address sent to Better Auth with trustProxy=$trustProxy",
  async ({ trustProxy, address }) => {
    const handle = vi.fn(async (_request: Request) => new Response());
    const { authentication } = stubAuthentication(handle);
    const request = Object.assign(
      new Request(new URL("/api/auth/sign-in/email", trustedOrigin), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Real-IP": "::ffff:192.0.2.2",
          "X-Forwarded-For": "192.0.2.3",
        },
        body: JSON.stringify({ email: "me@example.com" }),
      }),
      { ip: "192.0.2.1" },
    );

    const response = await createApp({ authentication, trustProxy }).request(request);

    expect(response.status).toBe(200);
    expect(handle).toHaveBeenCalledOnce();
    const [[forwarded]] = handle.mock.calls;
    expect(forwarded.headers.get("X-Forwarded-For")).toBe(address);
    expect(forwarded.headers.has("X-Real-IP")).toBe(false);
    expect(await forwarded.json()).toEqual({ email: "me@example.com" });
  },
);

describe.each(["RPC", "REST"] as const)("%s route access", (transport) => {
  const routes = requests[transport];
  const writes = ["setRole", "savePersonal", "saveDirectory", "saveEmail"] as const;
  const protectedRoutes = ["me", "list", "personal", "directory", "email", ...writes] as const;
  const payload = (body: object) => (transport === "RPC" ? { json: body } : body);

  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
    try {
      configureLogger("api");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("serves ping without reading the session", async () => {
    const { app, getSession } = stubApp();
    const request = routes.ping();
    request.headers.set("Cookie", sessionCookie);

    const { response, log } = await requestWithLog(app, request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload({ ok: true }));
    expect(getSession).not.toHaveBeenCalled();
  });

  it.each([...protectedRoutes, "status", "install"] as const)(
    "%s returns 503 without an access service",
    async (route) => {
      const { response, log } = await requestWithLog(createApp(), routes[route]());

      expect(log).not.toHaveProperty("telemetry");
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject(payload({ code: "SERVICE_UNAVAILABLE" }));
    },
  );

  it.each(protectedRoutes)("%s returns 401 for anonymous requests", async (route) => {
    const { app, access } = stubApp();
    const request = routes[route]();
    request.headers.set("Origin", trustedOrigin);

    const { response, log } = await requestWithLog(app, request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject(payload({ code: "UNAUTHORIZED" }));
    expectNoBusinessCalls(access);
  });

  it("uses the read-only actor lookup for protected requests", async () => {
    const { app, access, getSession } = stubApp();
    access.settings.personal.mockResolvedValue(personalSettings);
    const request = routes.personal();
    request.headers.set("Cookie", sessionCookie);

    const { response } = await requestWithLog(app, request);

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.json()).toEqual(payload(personalSettings));
    expect(getSession).toHaveBeenCalledExactlyOnceWith({
      headers: request.headers,
      returnHeaders: true,
      query: { disableRefresh: true },
    });
  });

  it("forwards an expired session cookie on a protected read", async () => {
    const { app, access, getSession } = stubApp();
    const expired = "kipivo.session_token=; Path=/; Max-Age=0; HttpOnly";
    getSession.mockResolvedValue({
      headers: new Headers({ "Set-Cookie": expired }),
      response: null,
    });
    const request = routes.personal();
    request.headers.set("Cookie", sessionCookie);

    const { response } = await requestWithLog(app, request);

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([expired]);
    expectNoBusinessCalls(access);
  });

  describe.each([...writes, "install"] as const)("%s", (route) => {
    it.each([
      { label: "missing", origin: undefined },
      { label: "wrong", origin: wrongOrigin },
    ])("returns 403 for a signed-in request with $label Origin", async ({ origin }) => {
      const { app, access } = stubApp();
      const request = routes[route]();
      request.headers.set("Cookie", sessionCookie);
      if (origin) request.headers.set("Origin", origin);

      const { response, log } = await requestWithLog(app, request);

      expect(log).not.toHaveProperty("telemetry");
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject(payload({ code: "FORBIDDEN" }));
      expectNoBusinessCalls(access);
    });
  });

  it("reads install status without a session or Origin", async () => {
    const { app, access, getSession } = stubApp();
    access.setup.isOpen.mockResolvedValue(true);
    const request = routes.status();
    request.headers.set("Cookie", sessionCookie);

    const { response, log } = await requestWithLog(app, request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload({ open: true }));
    expect(getSession).not.toHaveBeenCalled();
  });

  it("allows an anonymous installation from the trusted Origin", async () => {
    const { app, access, getSession } = stubApp();
    access.setup.install.mockResolvedValue("ok");
    const request = routes.install();
    request.headers.set("Origin", trustedOrigin);

    const { response, log } = await requestWithLog(app, request);

    expect(log.telemetry).toStrictEqual({ event: "install.completed" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload({ ok: true }));
    expect(getSession).not.toHaveBeenCalled();
    expect(access.setup.install).toHaveBeenCalledExactlyOnceWith(administrator);
  });

  it("allows a role change from the trusted Origin when the service authorizes it", async () => {
    const { app, access, getSession } = stubApp();
    const account = { ...roleChange, name: "Other Account", email: "other@app.example" };
    access.accounts.changeRole.mockResolvedValue({ status: "ok", value: account });
    const request = signedWrite(routes.setRole());
    const { response, log } = await requestWithLog(app, request);

    expect(log.telemetry).toStrictEqual({ event: "account.role_set" });
    expect(log.access).toStrictEqual({ actorId, targetId: roleChange.id, role: roleChange.role });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload(account));
    expect(getSession).toHaveBeenCalledExactlyOnceWith({
      headers: request.headers,
      returnHeaders: true,
      query: { disableRefresh: true },
    });
    expect(access.accounts.changeRole).toHaveBeenCalledExactlyOnceWith(actorId, roleChange);
  });

  it("records successful personal settings saves without including the settings", async () => {
    const { app, access } = stubApp();
    access.settings.savePersonal.mockResolvedValue(personalSettings);

    const { response, log } = await requestWithLog(app, signedWrite(routes.savePersonal()));

    expect(log.telemetry).toStrictEqual({ event: "settings.personal_saved" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload(personalSettings));
    expect(access.settings.savePersonal).toHaveBeenCalledExactlyOnceWith(actorId, personalSettings);
  });

  it.each([true, false])(
    "records email configuration only if saved (accepted: %s), never its key or sender",
    async (accepted) => {
      const { app, access } = stubApp();
      const value = { enabled: true, from: emailSettingsInput.from, hasApiKey: true };
      access.email.save.mockResolvedValue({ status: "ok", value: accepted ? value : null });
      const { response, log } = await requestWithLog(app, signedWrite(routes.saveEmail()));

      expect(response.status).toBe(accepted ? 200 : 400);
      if (accepted) expect(log.telemetry).toStrictEqual({ event: "settings.email_saved" });
      else expect(log).not.toHaveProperty("telemetry");
      expect(JSON.stringify(log)).not.toContain(emailSettingsInput.apiKey);
      expect(JSON.stringify(log)).not.toContain(emailSettingsInput.from);
    },
  );

  it("records successful directory settings saves without including the settings", async () => {
    const { app, access } = stubApp();
    access.settings.saveDirectory.mockResolvedValue({ status: "ok", value: directorySettings });

    const { response, log } = await requestWithLog(app, signedWrite(routes.saveDirectory()));

    expect(log.telemetry).toStrictEqual({ event: "settings.directory_saved" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload(directorySettings));
    expect(access.settings.saveDirectory).toHaveBeenCalledExactlyOnceWith(
      actorId,
      directorySettings,
    );
  });

  it.each([
    ["closed", 409, "SETUP_CLOSED"],
    ["unavailable", 503, "SERVICE_UNAVAILABLE"],
  ] as const)("does not record an install when setup reports %s", async (result, status, code) => {
    const { app, access } = stubApp();
    access.setup.install.mockResolvedValue(result);
    const request = routes.install();
    request.headers.set("Origin", trustedOrigin);

    const { response, log } = await requestWithLog(app, request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject(payload({ code }));
  });

  it.each([
    ["forbidden", 403, "FORBIDDEN"],
    ["not_found", 404, "NOT_FOUND"],
  ] as const)(
    "does not record a role change when the service reports %s",
    async (result, status, code) => {
      const { app, access } = stubApp();
      access.accounts.changeRole.mockResolvedValue({ status: result });

      const { response, log } = await requestWithLog(app, signedWrite(routes.setRole()));

      expect(log).not.toHaveProperty("telemetry");
      expect(log).not.toHaveProperty("access");
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject(payload({ code }));
    },
  );

  it("does not record a directory settings save denied by the service", async () => {
    const { app, access } = stubApp();
    access.settings.saveDirectory.mockResolvedValue({ status: "forbidden" });

    const { response, log } = await requestWithLog(app, signedWrite(routes.saveDirectory()));

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject(payload({ code: "FORBIDDEN" }));
  });

  it("does not record an invalid personal settings save", async () => {
    const { app, access } = stubApp();
    const request = signedWrite(routes.savePersonal({ menuLabel: "invalid" }));

    const { response, log } = await requestWithLog(app, request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(400);
    expect(access.settings.savePersonal).not.toHaveBeenCalled();
  });

  it("does not record a personal settings save when the repository throws", async () => {
    const { app, access } = stubApp();
    access.settings.savePersonal.mockRejectedValue(new Error("Write failed."));

    const { response, log } = await requestWithLog(app, signedWrite(routes.savePersonal()));

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject(payload({ code: "INTERNAL_SERVER_ERROR" }));
  });
});

it("projects RPC session reads to public fields and fails closed without configured auth", async () => {
  const read = () => rpc("/auth/session/get");
  expect((await createApp().request(read())).status).toBe(503);
  const session = { id: "s", expiresAt: "2026-12-01T00:00:00.000Z" };
  const user = { id: "u", name: "Test", email: "me@example.com" };
  const { app, access, getSession } = stubApp();
  getSession.mockImplementation(async () => ({
    headers: null,
    response: {
      user,
      session: {
        ...session,
        expiresAt: new Date(session.expiresAt),
        token: "secret",
        ipAddress: "private",
      },
    },
  }));
  const response = await app.request(read());
  expect(await response.json()).toEqual({ json: { user, session } });
  expectNoBusinessCalls(access);
});

it("forwards the cookie clearing headers when Better Auth rejects a session refresh", async () => {
  const expiredCookie = "kipivo.session_token=; Path=/; Max-Age=0; HttpOnly";
  const error = new APIError("UNAUTHORIZED");
  Object.defineProperty(error, kAPIErrorHeaderSymbol, {
    value: new Headers({ "Set-Cookie": expiredCookie }),
  });
  const { authentication, getSession } = stubAuthentication();
  getSession.mockRejectedValue(error);
  const response = await createApp({ authentication }).request(rpc("/auth/session/get"));
  expect(response.status).toBe(401);
  expect(response.headers.getSetCookie()).toEqual([expiredCookie]);
  expect(await response.json()).toMatchObject({ json: { code: "UNAUTHORIZED" } });
});

describe.each([
  { route: "explicit RPC session", request: () => rpc("/auth/session/get"), isRpc: true },
  { route: "protected RPC", request: requests.RPC.me, isRpc: true },
  { route: "protected REST", request: requests.REST.me, isRpc: false },
])("$route lookup failures", ({ request, isRpc }) => {
  const upstreamMessage = "Private auth dependency unavailable";

  it("maps a Better Auth error and forwards retry information", async () => {
    const error = new APIError(
      "SERVICE_UNAVAILABLE",
      { message: upstreamMessage },
      {
        "Retry-After": "30",
        "X-Internal-Auth": "private",
      },
    );
    const { app, access, getSession } = stubApp();
    getSession.mockRejectedValue(error);

    const { response } = await requestWithLog(app, request());

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("X-Internal-Auth")).toBeNull();
    const body = await response.json();
    const expected = { code: "SERVICE_UNAVAILABLE", defined: true };
    expect(body).toMatchObject(isRpc ? { json: expected } : expected);
    expect(JSON.stringify(body)).not.toContain(upstreamMessage);
    expectNoBusinessCalls(access);
  });

  it("lets oRPC handle unexpected exceptions", async () => {
    const error = new Error(upstreamMessage);
    const { app, access, getSession } = stubApp();
    getSession.mockRejectedValue(error);

    const { response } = await requestWithLog(app, request());

    expect(response.status).toBe(500);
    const body = await response.json();
    const expected = { code: "INTERNAL_SERVER_ERROR", defined: false };
    expect(body).toMatchObject(isRpc ? { json: expected } : expected);
    expect(JSON.stringify(body)).not.toContain(upstreamMessage);
    expectNoBusinessCalls(access);
  });
});

it("RPC includes the account only for a valid session", async () => {
  const read = () => rpc("/auth/session/get", { includeAccount: true });
  const user = { id: actorId, name: "Test", email: "me@example.com" };
  const session = { id: "s", expiresAt: "2026-12-01T00:00:00.000Z" };
  const account = { ...user, role: "member", permissions: ["account.read"] } as const;
  const { app, access, getSession } = stubApp();
  access.accounts.getMe.mockResolvedValue({
    status: "ok",
    value: { ...account, permissions: [...account.permissions] },
  });
  access.settings.personal.mockResolvedValue(personalSettings);
  const refreshCookies = [sessionCookie, "kipivo.session_data=refreshed; Path=/; HttpOnly"];
  const refreshHeaders = new Headers();
  for (const cookie of refreshCookies) refreshHeaders.append("Set-Cookie", cookie);
  getSession.mockImplementation(async ({ headers }) =>
    headers.get("cookie") === sessionCookie
      ? {
          headers: refreshHeaders,
          response: {
            user,
            session: { ...session, expiresAt: new Date(session.expiresAt), token: "secret" },
          },
        }
      : { headers: null, response: null },
  );
  const anonymous = await app.request(read());
  expect(anonymous.status).toBe(200);
  expect(await anonymous.json()).toEqual({ json: null });
  expectNoBusinessCalls(access);

  const request = read();
  request.headers.set("Cookie", sessionCookie);
  const signedIn = await app.request(request);
  expect(signedIn.status).toBe(200);
  expect(signedIn.headers.getSetCookie()).toEqual(refreshCookies);
  expect(signedIn.headers.get("cache-control")).toBe("no-store");
  expect(await signedIn.json()).toEqual({
    json: { user, session, account: { ...account, settings: personalSettings } },
  });
  expect(access.accounts.getMe).toHaveBeenCalledExactlyOnceWith(actorId);
  expect(access.settings.personal).toHaveBeenCalledExactlyOnceWith(actorId);
  expect(getSession.mock.calls).toEqual([
    [{ headers: expect.any(Headers), returnHeaders: true }],
    [{ headers: request.headers, returnHeaders: true }],
  ]);
});
