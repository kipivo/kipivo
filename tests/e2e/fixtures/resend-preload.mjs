// Loaded only in the disposable API child. Exercise the real mail adapter without network delivery.
import { writeFileSync } from "node:fs";
const fetchOriginal = globalThis.fetch;
globalThis.fetch = Object.assign(async (input, init) => {
  if (String(input) !== "https://api.resend.com/emails") return fetchOriginal(input, init);
  writeFileSync(process.env.E2E_MAIL_FILE, init.body, { mode: 0o600 });
  return Response.json({ id: "local-delivery" });
}, fetchOriginal);
