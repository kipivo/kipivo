import type { Route } from "@orpc/contract";

const sessionSecurity: Record<string, string[]>[] = [
  { sessionCookie: [] },
  { secureSessionCookie: [] },
];
export const sessionRequired = ((operation) => ({
  ...operation,
  security: sessionSecurity,
})) satisfies NonNullable<Route["spec"]>;
export const originHeader = {
  in: "header",
  name: "Origin",
  required: true,
  schema: { type: "string" },
  description: "Must match the configured public Web origin.",
} as const;
