import { ORPCError, ResponseError } from "@orpc/client";

export function errorStatus(error: unknown): number | undefined {
  const responseError = error instanceof ORPCError ? error.cause : error;
  if (responseError instanceof ResponseError) return responseError.response.status;
}
