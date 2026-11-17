import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";

export const contract = {
  system: {
    ping: oc.output(z.object({ ok: z.literal(true) })),
  },
};

export type ApiClient = ContractRouterClient<typeof contract>;
