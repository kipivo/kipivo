import type { LoggerEnv } from "@kipivo/logger/hono";
import { asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { RequestAccess } from "./access";

/** The operations available to HTTP handlers; resource lifecycle stays with the runtime. */
export interface AppServices {
  handleAuth?(request: Request): Promise<Response>;
  access?: RequestAccess;
  ready?(): Promise<boolean>;
}

type AppDependencies = { appServices: AppServices };

export type AppEnv = {
  Variables: LoggerEnv["Variables"] & { servicesScope: AwilixContainer<AppDependencies> };
};

export function provideServices(services: AppServices) {
  const container = createContainer<AppDependencies>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
  container.register({ appServices: asValue(services) });

  return createMiddleware<AppEnv>((context, next) => {
    context.set("servicesScope", container.createScope());
    return next();
  });
}

export function requestServices(context: Context<AppEnv>) {
  return context.var.servicesScope.cradle.appServices;
}
