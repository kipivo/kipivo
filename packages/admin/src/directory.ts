import { accountId } from "@kipivo/account";
import { z } from "zod";

export const directoryQueryMaxLength = 128;
const pageSize = z.int().min(1).max(100);

export const directoryListInput = z.object({
  cursor: accountId.optional(),
  limit: pageSize.optional(),
  query: z
    .string()
    .trim()
    .max(directoryQueryMaxLength)
    .refine((text) => !text.includes("\u0000"), "Invalid search text")
    .optional(),
});
export const directorySettings = z.strictObject({ pageSize });

export type DirectoryListInput = z.output<typeof directoryListInput>;
export type DirectorySettings = z.output<typeof directorySettings>;
