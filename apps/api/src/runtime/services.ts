import type { RequestIdentity } from "@kipivo/auth/session";
import type { ProcedureServices } from "@kipivo/orpc";

export interface Authentication {
  handle(request: Request): Promise<Response>;
  identify(headers: Headers, outgoing: Headers): RequestIdentity;
  trustedOrigins: readonly string[];
  cookiePrefix: string;
}

export interface AppServices {
  authentication?: Authentication;
  procedures?: ProcedureServices;
  ready?(): Promise<boolean>;
  trustProxy?: boolean;
}
