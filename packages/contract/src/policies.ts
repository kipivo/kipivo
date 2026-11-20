import { defineMeta, oc } from "@orpc/contract";
import { openapi, type OpenAPIMeta } from "@orpc/openapi";

const [requireTrustedOrigin, requiresTrustedOrigin] = defineMeta(
  "kipivo/trustedOrigin",
  (required: boolean) => required,
);

const sessionSecurity: Record<string, string[]>[] = [
  { sessionCookie: [] },
  { secureSessionCookie: [] },
];
const sessionRequired = ((operation) => ({
  ...operation,
  security: sessionSecurity,
})) satisfies NonNullable<OpenAPIMeta["spec"]>;
const originHeader = {
  in: "header",
  name: "Origin",
  required: true,
  schema: { type: "string" },
  description: "Must match a configured trusted Web origin.",
} as const;
const originRequired = ((operation) => ({
  ...operation,
  parameters: [...(operation.parameters ?? []), originHeader],
})) satisfies NonNullable<OpenAPIMeta["spec"]>;

const trustedOriginMeta = [requireTrustedOrigin(true), openapi.spec(originRequired)] as const;

export const trustedOrigin = oc.meta(...trustedOriginMeta);

export const sessionRead = oc.meta(openapi.spec(sessionRequired)).errors({
  UNAUTHORIZED: { message: "Sign in to continue." },
  FORBIDDEN: { message: "This action is not permitted." },
  SERVICE_UNAVAILABLE: { message: "Account service is unavailable." },
});

export const trustedWrite = sessionRead.meta(...trustedOriginMeta);

export { requiresTrustedOrigin };
