import { defineMeta } from "@orpc/contract";
import { openapi, type OpenAPIMeta } from "@orpc/openapi";

type RestRoute = OpenAPIMeta & {
  method: NonNullable<OpenAPIMeta["method"]>;
  path: NonNullable<OpenAPIMeta["path"]>;
};

const [exposeOverRest, getRestExposure] = defineMeta(
  "kipivo/exposeOverRest",
  (enabled: true) => enabled,
);

export function restRoute(route: RestRoute) {
  return [exposeOverRest(true), openapi(route)] as const;
}

export function isRestProcedure(procedure: Parameters<typeof getRestExposure>[0]) {
  return getRestExposure(procedure) === true;
}
