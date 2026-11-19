import "reflect-metadata/lite";
import type { Context, ContextVariableMap } from "hono";
import type { LoggerEnv } from "@kipivo/logger/hono";
import type { RequestAccess } from "./access";

/** The operations available to HTTP handlers; resource lifecycle stays with the runtime. */
export interface AppServices {
  handleAuth?(request: Request): Promise<Response>;
  access?: RequestAccess;
  ready?(): Promise<boolean>;
}

export type AppEnv = {
  Variables: LoggerEnv["Variables"] & Pick<ContextVariableMap, "resolve">;
};

// Nitro bundles the CommonJS polyfill separately; load the DI bridge only after it runs.
const { tsyringe } = await import("@hono/tsyringe");
const servicesToken = Symbol("AppServices");

export function provideServices(services: AppServices) {
  // Borrow the runtime instance in each request; never register resource owners globally.
  return tsyringe((scope) => scope.registerInstance<AppServices>(servicesToken, services));
}

export function requestServices(context: Context<AppEnv>) {
  return context.var.resolve<AppServices>(servicesToken);
}
