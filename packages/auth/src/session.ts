import { APIError, kAPIErrorHeaderSymbol } from "better-call/error";

export type SessionSnapshot = {
  user: { id: string; name: string; email: string };
  session: { id: string; expiresAt: Date };
};

export interface RequestIdentity {
  readSession(): Promise<SessionSnapshot | null>;
  getActorId(): Promise<string | undefined>;
}

type SessionSource = {
  api: {
    getSession(input: {
      headers: Headers;
      returnHeaders: true;
      query?: { disableRefresh: true };
    }): Promise<{ headers: Headers | null; response: SessionSnapshot | null }>;
  };
};

export class SessionReadError extends Error {
  constructor(
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super("Authentication session read failed.", options);
    this.name = "SessionReadError";
  }
}

function forwardSessionHeaders(headers: Headers | null, outgoing: Headers) {
  if (!headers) return;
  for (const cookie of headers.getSetCookie()) outgoing.append("set-cookie", cookie);
  const retryAfter = headers.get("retry-after");
  if (retryAfter !== null) outgoing.set("retry-after", retryAfter);
}

export function createRequestIdentity(
  auth: SessionSource,
  headers: Headers,
  outgoing: Headers,
): RequestIdentity {
  let session: Promise<SessionSnapshot | null> | undefined;
  let actorId: Promise<string | undefined> | undefined;

  async function getSession(query?: { disableRefresh: true }) {
    try {
      const result = await auth.api.getSession({
        headers,
        returnHeaders: true,
        ...(query ? { query } : {}),
      });
      forwardSessionHeaders(result.headers, outgoing);
      return result.response;
    } catch (cause) {
      if (!(cause instanceof APIError)) throw cause;
      // Better Auth attaches merged endpoint headers to a failed session read.
      const endpointHeaders = Reflect.get(cause, kAPIErrorHeaderSymbol);
      forwardSessionHeaders(
        endpointHeaders instanceof Headers ? endpointHeaders : new Headers(cause.headers),
        outgoing,
      );
      throw new SessionReadError(cause.statusCode, { cause });
    }
  }

  return {
    readSession: () =>
      (session ??= getSession().then((result) => {
        if (!result) return null;
        const { user, session } = result;
        return {
          user: { id: user.id, name: user.name, email: user.email },
          session: { id: session.id, expiresAt: session.expiresAt },
        };
      })),
    getActorId: () => (actorId ??= getSession({ disableRefresh: true }).then((r) => r?.user.id)),
  };
}
