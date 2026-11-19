import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createEnv, defineEnv, EnvError, z, type Preset } from "./index";

describe("defineEnv", () => {
  it("reads declared keys and applies defaults and transforms without rewriting input", () => {
    const runtimeEnv = {
      APP_NAME: " Example ",
      PORT: "  ",
      ENABLED: "true",
      get PRIVATE_TOKEN(): string {
        throw new Error("Undeclared input was read.");
      },
    };
    const schema = z.object({
      APP_NAME: z.string(),
      PORT: z.coerce.number().default(3000),
      ENABLED: z.enum(["true", "false"]).transform((value) => value === "true"),
    });

    expect(defineEnv({ schema, runtimeEnv })).toEqual({
      APP_NAME: " Example ",
      PORT: 3000,
      ENABLED: true,
    });
    expect(runtimeEnv.PORT).toBe("  ");
  });

  it("reports declared variable names without leaking values or custom messages", () => {
    const schema = z.object({
      TOKEN: z.literal("expected-token"),
      URL: z.string().refine(() => false, { message: "must not expose this custom issue" }),
    });
    const runtimeEnv = { TOKEN: "raw-secret-token", URL: "raw-private-url" };

    expect(() => defineEnv({ schema, runtimeEnv })).toThrow(
      new EnvError("Invalid environment variables: TOKEN, URL."),
    );
  });
});

describe("createEnv", () => {
  const preset = {
    id: "test",
    server: {
      PORT: z.coerce.number().default(3000),
      ENABLED: z.enum(["true", "false"]).transform((value) => value === "true"),
    },
  } as const satisfies Preset;

  it("infers schema outputs and uses an explicit runtime environment", () => {
    const env = createEnv(preset, { runtimeEnv: { PORT: " ", ENABLED: "true" } });

    expectTypeOf(env).toEqualTypeOf<{ PORT: number; ENABLED: boolean }>();
    expect(env).toEqual({ PORT: 3000, ENABLED: true });
  });

  it("inherits nested presets, applying later parent schemas and then child schemas", () => {
    const shared = {
      id: "shared",
      server: { SHARED: z.string(), PORT: z.literal("unused") },
    } as const satisfies Preset;
    const first = {
      id: "first",
      extends: [shared],
      server: { PORT: z.string(), ENABLED: z.literal("unused") },
    } as const satisfies Preset;
    const second = {
      id: "second",
      extends: [shared],
      server: { PORT: z.coerce.number(), ENABLED: z.coerce.number() },
    } as const satisfies Preset;
    const env = createEnv(
      {
        id: "app",
        extends: [first, second],
        server: { ENABLED: z.stringbool(), NAME: z.string().optional() },
      },
      { runtimeEnv: { SHARED: "shared", PORT: "8080", ENABLED: "true" } },
    );

    expectTypeOf(env).toEqualTypeOf<{
      SHARED: string;
      PORT: number;
      ENABLED: boolean;
      NAME?: string | undefined;
    }>();
    expect(env).toEqual({ SHARED: "shared", PORT: 8080, ENABLED: true });
  });

  it("accepts parent arrays whose order and length are unknown", () => {
    const first = { id: "first", server: { VALUE: z.string() } };
    const second = { id: "second", server: { VALUE: z.coerce.number(), NAME: z.string() } };
    const parents = [first, second];
    const env = createEnv(
      { id: "app", extends: parents, server: { PORT: z.coerce.number() } },
      { runtimeEnv: { VALUE: "1", NAME: "app", PORT: "8080" } },
    );

    expectTypeOf(env.VALUE).toBeUnknown();
    expect(env).toEqual({ VALUE: 1, NAME: "app", PORT: 8080 });
  });

  it("rejects cycles between presets", () => {
    const parents: Preset[] = [];
    const first: Preset = { id: "first", extends: parents, server: {} };
    const second: Preset = { id: "second", extends: [first], server: {} };
    parents.push(second);

    expect(() => createEnv(first, { runtimeEnv: {} })).toThrow(
      new EnvError('Circular environment preset detected at "first".'),
    );
  });

  it("reads the current process environment for each call", () => {
    try {
      vi.stubEnv("PORT", undefined);
      vi.stubEnv("ENABLED", "true");
      expect(createEnv(preset).ENABLED).toBe(true);
      vi.stubEnv("ENABLED", "false");
      expect(createEnv(preset).ENABLED).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
