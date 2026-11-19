import { initLogger } from "evlog";
import { envs } from "#env";

export { createLogger, log } from "evlog";

export function configureLogger(service: string) {
  const { NODE_ENV, CI } = envs();
  initLogger({
    env: { service, environment: NODE_ENV },
    pretty: NODE_ENV === "development" && !CI,
    stringify: true,
  });
}
