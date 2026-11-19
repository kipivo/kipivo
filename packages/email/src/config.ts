import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { z } from "zod";
import { emailSettingsInput, type EmailSettingsInput } from "./settings";
// Domain-separated encryption for the write-only Resend credential in config_app.
function emailKeyCipher(secret: string) {
  const key = Buffer.from(hkdfSync("sha256", secret, "kipivo", "email/resend/api-key/v1", 32));
  return {
    seal(value: string) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
    },
    open(value: string) {
      const bytes = Buffer.from(value, "base64url");
      const cipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
      cipher.setAuthTag(bytes.subarray(12, 28));
      return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8");
    },
  };
}

export const storedEmailSettings = z.strictObject({
  enabled: z.boolean(),
  from: z.email().nullable(),
  sealedKey: z.string().min(1).nullable(),
});
type StoredSettings = z.infer<typeof storedEmailSettings>;
export const redactEmailSettings = (value: StoredSettings) => ({
  enabled: value.enabled,
  from: value.from,
  hasApiKey: value.sealedKey !== null,
});

export function createEmailConfig(secret: string) {
  const cipher = emailKeyCipher(secret);
  return {
    delivery(value: StoredSettings) {
      return value.enabled && value.from && value.sealedKey
        ? { from: value.from, apiKey: cipher.open(value.sealedKey) }
        : null;
    },
    update(previous: StoredSettings, input: EmailSettingsInput): StoredSettings | null {
      const { enabled, from, apiKey } = emailSettingsInput.parse(input);
      const sealedKey =
        apiKey === undefined ? previous.sealedKey : apiKey === null ? null : cipher.seal(apiKey);
      return enabled && (!from || !sealedKey) ? null : { enabled, from, sealedKey };
    },
  };
}
