import { createEnv, EnvError, z, type Preset } from "@kipivo/env";

export interface ObjectStorageOptions {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const storageEnv = {
  id: "storage",
  server: {
    S3_ENDPOINT: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
  },
} as const satisfies Preset;

export const envs = () => createEnv(storageEnv);

export function resolveStorageConfig({
  S3_ENDPOINT,
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
}: ReturnType<typeof envs>) {
  if (!S3_ENDPOINT && !S3_BUCKET && !S3_REGION && !S3_ACCESS_KEY_ID && !S3_SECRET_ACCESS_KEY) {
    return null;
  }
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new EnvError(
      "Set S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY together.",
    );
  }

  const config = {
    endpoint: S3_ENDPOINT,
    bucket: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  };
  validateStorageOptions(config);
  return config;
}

export function validateStorageOptions(options: ObjectStorageOptions): URL {
  const { endpoint, bucket, region, accessKeyId, secretAccessKey } = options;
  const url = URL.parse(endpoint);
  if (
    !url ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.href.includes("?") ||
    url.href.includes("#")
  ) {
    throw new EnvError(
      "S3_ENDPOINT must be an HTTP(S) URL without credentials, query, or fragment.",
    );
  }
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
    bucket.includes("..") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(bucket)
  ) {
    throw new EnvError("S3_BUCKET must be a valid S3 bucket name.");
  }
  if (!region.trim()) throw new EnvError("S3_REGION must be non-empty.");
  if (!accessKeyId.trim()) throw new EnvError("S3_ACCESS_KEY_ID must be non-empty.");
  if (!secretAccessKey.trim()) throw new EnvError("S3_SECRET_ACCESS_KEY must be non-empty.");
  return url;
}
