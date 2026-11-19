import { z } from "zod";

export { z };

export type RuntimeEnv = Readonly<Record<string, string | undefined>>;

export type Preset = {
  readonly id: string;
  readonly extends?: readonly Preset[];
  readonly server: Readonly<Record<string, z.ZodType>>;
};

type Merge<Left, Right> = Omit<Left, keyof Right> & Right;
type PresetShape<Value extends Preset> = Value extends {
  readonly extends: infer Parents extends readonly Preset[];
}
  ? Merge<ParentShapes<Parents>, Value["server"]>
  : Value["server"];
// Only fixed tuples can provide a known order for all inherited keys.
type ParentShapes<
  Parents extends readonly Preset[],
  Shape extends Preset["server"] = {},
> = Parents extends readonly [infer Parent extends Preset, ...infer Rest extends readonly Preset[]]
  ? ParentShapes<Rest, Merge<Shape, PresetShape<Parent>>>
  : number extends Parents["length"]
    ? Preset["server"]
    : Shape;
type EnvSchema<Value extends Preset> = z.ZodObject<{
  -readonly [Key in keyof PresetShape<Value>]: PresetShape<Value>[Key];
}>;

declare const process: { readonly env: RuntimeEnv };

export function createEnv<const Value extends Preset>(
  preset: Value,
  options?: { readonly runtimeEnv?: RuntimeEnv },
): z.output<EnvSchema<Value>> {
  // Read the environment through the schema keys so bundlers cannot inline NODE_ENV.
  return defineEnv({
    schema: z.object(resolvePreset(preset) as PresetShape<Value>),
    runtimeEnv: options?.runtimeEnv ?? process.env,
  });
}

function resolvePreset(preset: Preset, ancestors = new Set<Preset>()): Preset["server"] {
  if (ancestors.has(preset)) {
    throw new EnvError(`Circular environment preset detected at "${preset.id}".`);
  }

  ancestors.add(preset);
  let server: Preset["server"] = {};
  for (const parent of preset.extends ?? []) {
    server = { ...server, ...resolvePreset(parent, ancestors) };
  }
  ancestors.delete(preset);
  return { ...server, ...preset.server };
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export function defineEnv<Schema extends z.ZodObject>({
  schema,
  runtimeEnv,
}: {
  schema: Schema;
  runtimeEnv: RuntimeEnv;
}): z.output<Schema> {
  const keys = Object.keys(schema.shape);
  const values = Object.fromEntries(
    keys.map((key) => {
      const value = runtimeEnv[key];
      return [key, value?.trim() === "" ? undefined : value];
    }),
  );
  const result = schema.safeParse(values);
  if (result.success) return result.data;

  const invalidKeys = new Set<unknown>();
  for (const issue of result.error.issues) {
    invalidKeys.add(issue.path[0]);
  }
  const names = keys.filter((key) => invalidKeys.has(key));
  throw new EnvError(
    names.length ? `Invalid environment variables: ${names.join(", ")}.` : "Invalid environment.",
  );
}

export function parseHttpOrigin(value: string): string | null {
  const url = URL.parse(value);
  if (!url || url.href !== `${url.origin}/` || !["http:", "https:"].includes(url.protocol)) {
    return null;
  }
  return url.origin;
}
