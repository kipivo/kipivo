import { z } from "zod";

// Public allowlist. System-managed configuration is deliberately not part of these schemas.
export const personalSettings = z.strictObject({ menuLabel: z.enum(["name", "email"]) });
export type PersonalSettings = z.infer<typeof personalSettings>;
