import { createEnv, type RuntimeEnv } from "@kipivo/env";
import { describe, expect, it } from "vitest";
import { resolveApiOrigin, webEnv } from "./env.server";

describe("resolveApiOrigin", () => {
  const parse = (development: boolean, runtimeEnv: RuntimeEnv) => {
    const env = createEnv(webEnv, { runtimeEnv });
    return resolveApiOrigin(env.API_ORIGIN, development);
  };

  it("uses localhost when the API origin is unset in development", () => {
    expect(parse(true, { API_ORIGIN: " " })).toBe("http://127.0.0.1:3001");
    expect(parse(false, {})).toBeNull();
  });

  it("accepts only an HTTP(S) origin and does not replace invalid input with localhost", () => {
    expect(parse(false, { API_ORIGIN: "https://api.example/" })).toBe("https://api.example");
    expect(parse(true, { API_ORIGIN: "https://api.example/path" })).toBeNull();
    expect(parse(true, { API_ORIGIN: "ftp://api.example" })).toBeNull();
  });
});
