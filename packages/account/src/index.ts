import { z } from "zod";

export const accountId = z.string().min(1).max(128);
export const accountProfile = z.object({
  id: accountId,
  name: z.string(),
  email: z.email(),
});

export type AccountProfile = z.infer<typeof accountProfile>;
