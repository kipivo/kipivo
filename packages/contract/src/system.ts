import { oc } from "@orpc/contract";
import { z } from "zod";
import { restRoute } from "./rest";

export const systemContract = {
  ping: oc
    .meta(...restRoute({ method: "GET", path: "/system/ping", summary: "Check API connectivity" }))
    .output(z.object({ ok: z.literal(true) })),
};
