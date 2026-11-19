import { AwsClient } from "aws4fetch";
import { type ObjectStorageOptions, validateStorageOptions } from "./env";

const requestTimeoutMs = 30_000;

function objectPath(key: string) {
  const segments = key.split("/");
  if (
    /[:\\?#\p{Cc}]/u.test(key) ||
    segments.some((segment) => !segment.trim() || segment === "." || segment === "..")
  ) {
    throw new Error("S3 object key must be a non-empty relative path without dot segments.");
  }
  return `kipivo/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export function createObjectStorage(options: ObjectStorageOptions) {
  const { bucket, region, accessKeyId, secretAccessKey } = options;
  const url = validateStorageOptions(options);
  const client = new AwsClient({ service: "s3", region, accessKeyId, secretAccessKey });
  const shutdown = new AbortController();
  const baseUrl = `${url.href.replace(/\/$/, "")}/${bucket}`;

  async function request(
    method: "GET" | "PUT" | "DELETE",
    key: string,
    body?: Uint8Array<ArrayBuffer>,
  ): Promise<Uint8Array | null> {
    shutdown.signal.throwIfAborted();
    const objectUrl = `${baseUrl}/${objectPath(key)}`;
    const signed = await client.sign(objectUrl, { method, body });
    const response = await fetch(signed, {
      signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(requestTimeoutMs)]),
    });
    if (method === "GET" && response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }

    await response.body?.cancel().catch(() => {});
    const { status, statusText } = response;
    const accepted = method === "DELETE" ? status === 200 || status === 204 : response.ok;
    if (accepted || (method === "GET" && status === 404)) return null;

    throw new Error(
      `[S3] [${method}] ${objectUrl}: ${status}${statusText ? ` ${statusText}` : ""}`,
    );
  }

  return {
    read(key: string): Promise<Uint8Array | null> {
      return request("GET", key);
    },
    async write(key: string, data: Uint8Array): Promise<void> {
      const body =
        data.buffer instanceof ArrayBuffer
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : new Uint8Array(data);
      await request("PUT", key, body);
    },
    async delete(key: string): Promise<void> {
      await request("DELETE", key);
    },
    async dispose(): Promise<void> {
      shutdown.abort();
    },
  };
}

export type ObjectStorage = ReturnType<typeof createObjectStorage>;
