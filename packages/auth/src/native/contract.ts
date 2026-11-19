import { z } from "zod";

const client = z.enum(["desktop", "expo"]);
const digest = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

// These are first-party public clients. Never accept a caller-supplied redirect URL.
export const nativeClients = {
  desktop: { name: "Kipivo Desktop", callback: "kipivo-desktop://auth/callback" },
  expo: { name: "Kipivo Mobile", callback: "kipivo://auth/callback" },
} as const;

export const nativeAuthorization = z.strictObject({
  client_id: client,
  state: z.string().regex(/^[A-Za-z0-9_-]{22,128}$/),
  code_challenge: digest,
  code_challenge_method: z.literal("S256"),
});

export const nativeExchange = z.strictObject({
  client_id: client,
  code: digest,
  code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
});

export type NativeAuthorization = z.infer<typeof nativeAuthorization>;

/** Return a code only for the exact callback and pending state this app initiated. */
export function readNativeCode(
  callback: string,
  pending: Pick<NativeAuthorization, "client_id" | "state">,
) {
  const prefix = `${nativeClients[pending.client_id].callback}?`;
  if (!callback.startsWith(prefix) || callback.includes("#")) return null;
  const params = new URLSearchParams(callback.slice(prefix.length));
  if (params.size !== 2 || params.get("state") !== pending.state) return null;
  return digest.safeParse(params.get("code")).data ?? null;
}
