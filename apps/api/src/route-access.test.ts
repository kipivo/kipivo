import { configureLogger } from "@kipivo/logger";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RequestAccess } from "./access";
import { createApp } from "./app";

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

function stubAccess() {
  return {
    trustedOrigin,
    getActorId: vi.fn(async (headers: Headers) =>
      headers.get("cookie") === sessionCookie ? actorId : undefined,
    ),
    accounts: {
      getMe: vi.fn<RequestAccess["accounts"]["getMe"]>(),
      list: vi.fn<RequestAccess["accounts"]["list"]>(),
      changeRole: vi.fn<RequestAccess["accounts"]["changeRole"]>(),
    },
    email: { get: vi.fn(), save: vi.fn<RequestAccess["email"]["save"]>() },
    settings: {
      personal: vi.fn<RequestAccess["settings"]["personal"]>(),
      savePersonal: vi.fn<RequestAccess["settings"]["savePersonal"]>(),
      directory: vi.fn<RequestAccess["settings"]["directory"]>(),
      saveDirectory: vi.fn<RequestAccess["settings"]["saveDirectory"]>(),
    },
    setup: {
      isOpen: vi.fn<RequestAccess["setup"]["isOpen"]>(),
      install: vi.fn<RequestAccess["setup"]["install"]>(),
    },
  } satisfies RequestAccess;
}

function expectNoBusinessCalls(access: ReturnType<typeof stubAccess>) {
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
    const access = stubAccess();
    const app = createApp({ access, ready: async () => true });

    const response = await app.request(path, { headers: { Cookie: sessionCookie } });

    expect(response.status).toBe(200);
    expect(access.getActorId).not.toHaveBeenCalled();
  },
);

it.each([
  ["GET", "/api/auth/get-session"],
  ["POST", "/api/auth/sign-out"],
])("delegates %s %s to handleAuth without reading the session", async (method, path) => {
  const access = stubAccess();
  const handleAuth = vi.fn(async (_request: Request) =>
    Response.json({ handledBy: "auth" }, { status: 202, headers: { "Set-Cookie": sessionCookie } }),
  );
  const app = createApp({ access, handleAuth });

  const response = await app.request(path, {
    method,
    headers: { Cookie: sessionCookie, Origin: wrongOrigin },
  });

  expect(response.status).toBe(202);
  expect(response.headers.get("set-cookie")).toBe(sessionCookie);
  expect(await response.json()).toEqual({ handledBy: "auth" });
  expect(handleAuth).toHaveBeenCalledTimes(1);
  const [[request]] = handleAuth.mock.calls;
  expect(request.method).toBe(method);
  expect(new URL(request.url).pathname).toBe(path);
  expect(request.headers.get("cookie")).toBe(sessionCookie);
  expect(request.headers.get("origin")).toBe(wrongOrigin);
  expect(access.getActorId).not.toHaveBeenCalled();
});

it("returns 503 when the auth handler is not configured", async () => {
  const response = await createApp().request("/api/auth/get-session");
  expect(response.status).toBe(503);
});

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
    const access = stubAccess();
    const request = routes.ping();
    request.headers.set("Cookie", sessionCookie);

    const { response, log } = await requestWithLog(createApp({ access }), request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload({ ok: true }));
    expect(access.getActorId).not.toHaveBeenCalled();
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
    const access = stubAccess();
    const request = routes[route]();
    request.headers.set("Origin", trustedOrigin);

    const { response, log } = await requestWithLog(createApp({ access }), request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject(payload({ code: "UNAUTHORIZED" }));
    expectNoBusinessCalls(access);
  });

  describe.each([...writes, "install"] as const)("%s", (route) => {
    it.each([
      { label: "missing", origin: undefined },
      { label: "wrong", origin: wrongOrigin },
    ])("returns 403 for a signed-in request with $label Origin", async ({ origin }) => {
      const access = stubAccess();
      const request = routes[route]();
      request.headers.set("Cookie", sessionCookie);
      if (origin) request.headers.set("Origin", origin);

      const { response, log } = await requestWithLog(createApp({ access }), request);

      expect(log).not.toHaveProperty("telemetry");
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject(payload({ code: "FORBIDDEN" }));
      expectNoBusinessCalls(access);
    });
  });

  it("reads install status without a session or Origin", async () => {
    const access = stubAccess();
    access.setup.isOpen.mockResolvedValue(true);
    const request = routes.status();
    request.headers.set("Cookie", sessionCookie);

    const { response, log } = await requestWithLog(createApp({ access }), request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload({ open: true }));
    expect(access.getActorId).not.toHaveBeenCalled();
  });

  it("allows an anonymous installation from the trusted Origin", async () => {
    const access = stubAccess();
    access.setup.install.mockResolvedValue("ok");
    const request = routes.install();
    request.headers.set("Origin", trustedOrigin);

    const { response, log } = await requestWithLog(createApp({ access }), request);

    expect(log.telemetry).toStrictEqual({ event: "install.completed" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload({ ok: true }));
    expect(access.getActorId).not.toHaveBeenCalled();
    expect(access.setup.install).toHaveBeenCalledExactlyOnceWith(administrator);
  });

  it("allows a role change from the trusted Origin when the service authorizes it", async () => {
    const access = stubAccess();
    const account = { ...roleChange, name: "Other Account", email: "other@app.example" };
    access.accounts.changeRole.mockResolvedValue({ status: "ok", value: account });
    const { response, log } = await requestWithLog(
      createApp({ access }),
      signedWrite(routes.setRole()),
    );

    expect(log.telemetry).toStrictEqual({ event: "account.role_set" });
    expect(log.access).toStrictEqual({ actorId, targetId: roleChange.id, role: roleChange.role });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload(account));
    expect(access.accounts.changeRole).toHaveBeenCalledExactlyOnceWith(actorId, roleChange);
  });

  it("records successful personal settings saves without including the settings", async () => {
    const access = stubAccess();
    access.settings.savePersonal.mockResolvedValue(personalSettings);

    const { response, log } = await requestWithLog(
      createApp({ access }),
      signedWrite(routes.savePersonal()),
    );

    expect(log.telemetry).toStrictEqual({ event: "settings.personal_saved" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload(personalSettings));
    expect(access.settings.savePersonal).toHaveBeenCalledExactlyOnceWith(actorId, personalSettings);
  });

  it.each([true, false])(
    "records email configuration only if saved (accepted: %s), never its key or sender",
    async (accepted) => {
      const access = stubAccess();
      const value = { enabled: true, from: emailSettingsInput.from, hasApiKey: true };
      access.email.save.mockResolvedValue({ status: "ok", value: accepted ? value : null });
      const { response, log } = await requestWithLog(
        createApp({ access }),
        signedWrite(routes.saveEmail()),
      );

      expect(response.status).toBe(accepted ? 200 : 400);
      if (accepted) expect(log.telemetry).toStrictEqual({ event: "settings.email_saved" });
      else expect(log).not.toHaveProperty("telemetry");
      expect(JSON.stringify(log)).not.toContain(emailSettingsInput.apiKey);
      expect(JSON.stringify(log)).not.toContain(emailSettingsInput.from);
    },
  );

  it("records successful directory settings saves without including the settings", async () => {
    const access = stubAccess();
    access.settings.saveDirectory.mockResolvedValue({ status: "ok", value: directorySettings });

    const { response, log } = await requestWithLog(
      createApp({ access }),
      signedWrite(routes.saveDirectory()),
    );

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
    const access = stubAccess();
    access.setup.install.mockResolvedValue(result);
    const request = routes.install();
    request.headers.set("Origin", trustedOrigin);

    const { response, log } = await requestWithLog(createApp({ access }), request);

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
      const access = stubAccess();
      access.accounts.changeRole.mockResolvedValue({ status: result });

      const { response, log } = await requestWithLog(
        createApp({ access }),
        signedWrite(routes.setRole()),
      );

      expect(log).not.toHaveProperty("telemetry");
      expect(log).not.toHaveProperty("access");
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject(payload({ code }));
    },
  );

  it("does not record a directory settings save denied by the service", async () => {
    const access = stubAccess();
    access.settings.saveDirectory.mockResolvedValue({ status: "forbidden" });

    const { response, log } = await requestWithLog(
      createApp({ access }),
      signedWrite(routes.saveDirectory()),
    );

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject(payload({ code: "FORBIDDEN" }));
  });

  it("does not record an invalid personal settings save", async () => {
    const access = stubAccess();
    const request = signedWrite(routes.savePersonal({ menuLabel: "invalid" }));

    const { response, log } = await requestWithLog(createApp({ access }), request);

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(400);
    expect(access.settings.savePersonal).not.toHaveBeenCalled();
  });

  it("does not record a personal settings save when the repository throws", async () => {
    const access = stubAccess();
    access.settings.savePersonal.mockRejectedValue(new Error("Write failed."));

    const { response, log } = await requestWithLog(
      createApp({ access }),
      signedWrite(routes.savePersonal()),
    );

    expect(log).not.toHaveProperty("telemetry");
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject(payload({ code: "INTERNAL_SERVER_ERROR" }));
  });
});

it.each(["RPC", "REST"])(
  "%s authentication forwards distinct cookies without returning the upstream session token",
  async (transport) => {
    const access = stubAccess();
    const handleAuth = vi.fn(async (request: Request) => {
      expect(new URL(request.url).pathname).toBe("/api/auth/sign-in/email");
      expect(request.headers.get("origin")).toBe(trustedOrigin);
      expect(await request.json()).toEqual({
        email: administrator.email,
        password: administrator.password,
      });
      const headers = new Headers();
      headers.append("Set-Cookie", "session=one; Path=/; HttpOnly");
      headers.append("Set-Cookie", "old=; Path=/; Max-Age=0");
      return Response.json({ token: "secret" }, { headers });
    });
    const body = { email: administrator.email, password: administrator.password };
    const request =
      transport === "RPC"
        ? rpc("/auth/session/create", body)
        : jsonRequest("/api/v1/auth/session", "POST", body);
    request.headers.set("Origin", trustedOrigin);
    const response = await createApp({ access, handleAuth }).request(request);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      "session=one; Path=/; HttpOnly",
      "old=; Path=/; Max-Age=0",
    ]);
    expect(await response.json()).toEqual(
      transport === "RPC" ? { json: { ok: true } } : { ok: true },
    );
  },
);

it.each(["RPC", "REST"])(
  "%s checks Origin and forwards session deletion as a Better Auth sign-out",
  async (transport) => {
    const handleAuth = vi.fn(async (request: Request) => {
      expect(request.method).toBe("POST");
      expect(new URL(request.url).pathname).toBe("/api/auth/sign-out");
      expect(await request.json()).toEqual({});
      return Response.json(
        { private: "upstream failure" },
        { status: 429, headers: { "Retry-After": "30" } },
      );
    });
    const app = createApp({ access: stubAccess(), handleAuth });
    for (const origin of [null, wrongOrigin, trustedOrigin]) {
      const req =
        transport === "RPC"
          ? new Request(new URL("/rpc/auth/session/delete", trustedOrigin), { method: "POST" })
          : new Request(new URL("/api/v1/auth/session", trustedOrigin), { method: "DELETE" });
      if (origin) req.headers.set("origin", origin);
      const res = await app.request(req);
      expect(res.status).toBe(origin === trustedOrigin ? 429 : 403);
      if (origin === trustedOrigin) expect(res.headers.get("retry-after")).toBe("30");
    }
    expect(handleAuth).toHaveBeenCalledTimes(1);
  },
);

it("projects RPC session reads to public fields and fails closed without configured auth", async () => {
  const read = () => rpc("/auth/session/get");
  expect((await createApp().request(read())).status).toBe(503);
  const session = { id: "s", expiresAt: "2026-12-01T00:00:00.000Z" };
  const user = { id: "u", name: "Test", email: "me@example.com" };
  const handleAuth = async () =>
    Response.json({ user, session: { ...session, token: "secret", ipAddress: "private" } });
  const access = stubAccess();
  const response = await createApp({ access, handleAuth }).request(read());
  expect(await response.json()).toEqual({ json: { user, session } });
  expectNoBusinessCalls(access);
});

it.each(["RPC", "REST"] as const)(
  "%s includes the account only for a valid session",
  async (transport) => {
    const read = () =>
      transport === "RPC"
        ? rpc("/auth/session/get", { includeAccount: true })
        : restRead("/auth/session?includeAccount=true");
    const payload = (body: unknown) => (transport === "RPC" ? { json: body } : body);
    const user = { id: actorId, name: "Test", email: "me@example.com" };
    const session = { id: "s", expiresAt: "2026-12-01T00:00:00.000Z" };
    const account = { ...user, role: "member", permissions: ["account.read"] } as const;
    const access = stubAccess();
    access.accounts.getMe.mockResolvedValue({
      status: "ok",
      value: { ...account, permissions: [...account.permissions] },
    });
    access.settings.personal.mockResolvedValue(personalSettings);
    const handleAuth = vi.fn(async (request: Request) =>
      request.headers.get("cookie") === sessionCookie
        ? Response.json(
            { user, session: { ...session, token: "secret" } },
            {
              headers: { "Set-Cookie": sessionCookie },
            },
          )
        : Response.json(null),
    );
    const app = createApp({ access, handleAuth });
    const anonymous = await app.request(read());
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toEqual(payload(null));
    expectNoBusinessCalls(access);

    const request = read();
    request.headers.set("Cookie", sessionCookie);
    const signedIn = await app.request(request);
    expect(signedIn.status).toBe(200);
    expect(signedIn.headers.get("set-cookie")).toBe(sessionCookie);
    expect(signedIn.headers.get("cache-control")).toBe("no-store");
    expect(await signedIn.json()).toEqual(
      payload({ user, session, account: { ...account, settings: personalSettings } }),
    );
    expect(access.accounts.getMe).toHaveBeenCalledExactlyOnceWith(actorId);
    expect(access.settings.personal).toHaveBeenCalledExactlyOnceWith(actorId);
    expect(access.getActorId).not.toHaveBeenCalled();
  },
);
