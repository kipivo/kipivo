import { defineMeta } from "@orpc/contract";
import type { OpenAPIMeta } from "@orpc/openapi";

export const [requireTrustedOrigin, requiresTrustedOrigin] = defineMeta(
  "kipivo/trustedOrigin",
  (required: boolean) => required,
);

const sessionSecurity: Record<string, string[]>[] = [
  { sessionCookie: [] },
  { secureSessionCookie: [] },
];
export const sessionRequired = ((operation) => ({
  ...operation,
  security: sessionSecurity,
})) satisfies NonNullable<OpenAPIMeta["spec"]>;
const originHeader = {
  in: "header",
  name: "Origin",
  required: true,
  schema: { type: "string" },
  description: "Must match the configured public Web origin.",
} as const;
export const originRequired = ((operation) => ({
  ...operation,
  parameters: [...(operation.parameters ?? []), originHeader],
})) satisfies NonNullable<OpenAPIMeta["spec"]>;
