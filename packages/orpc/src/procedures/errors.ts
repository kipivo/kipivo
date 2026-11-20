type AccessErrors = Record<"UNAUTHORIZED" | "FORBIDDEN", () => Error>;

export function readAccountResult<T>(
  result: { status: "ok"; value: T } | { status: "unauthorized" | "forbidden" },
  errors: AccessErrors,
): T {
  if (result.status === "ok") return result.value;
  throw result.status === "unauthorized" ? errors.UNAUTHORIZED() : errors.FORBIDDEN();
}
