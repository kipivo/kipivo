import { z } from "zod";
const address = z.email().max(254).nullable();
export const emailSettings = z.strictObject({
  enabled: z.boolean(),
  from: address,
  hasApiKey: z.boolean(),
});
// Omitting the credential preserves it. Null explicitly removes it.
export const emailSettingsInput = z.strictObject({
  enabled: z.boolean(),
  from: address,
  apiKey: z.string().trim().min(1).max(2048).nullable().optional(),
});
export type EmailSettings = z.infer<typeof emailSettings>;
export type EmailSettingsInput = z.infer<typeof emailSettingsInput>;
