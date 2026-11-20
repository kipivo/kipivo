import { SessionReadError } from "@kipivo/auth/session";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { clientAddress } from "./client-address";

// Match Better Auth's default production allowance for a session read.
export function createSessionLimit(trustProxy = false) {
  const limiter = new RateLimiterMemory({ points: 100, duration: 10 });
  return async (request: Request, outgoing: Headers) => {
    const address = clientAddress(request, trustProxy);
    try {
      await limiter.consume(address || "unknown");
    } catch (cause) {
      if (!(cause instanceof RateLimiterRes)) throw cause;
      outgoing.set("Retry-After", String(Math.max(1, Math.ceil(cause.msBeforeNext / 1000))));
      throw new SessionReadError(429);
    }
  };
}
