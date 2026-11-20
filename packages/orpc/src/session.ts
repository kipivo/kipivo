import { SessionReadError } from "@kipivo/auth/session";
import { ORPCError } from "@orpc/server";

const errorsByStatus: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_CONTENT",
  429: "TOO_MANY_REQUESTS",
  503: "SERVICE_UNAVAILABLE",
};

export async function readSessionIdentity<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (cause) {
    if (!(cause instanceof SessionReadError)) throw cause;
    throw new ORPCError(errorsByStatus[cause.status] ?? "INTERNAL_SERVER_ERROR", { cause });
  }
}
