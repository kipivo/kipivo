// Loaded only in the disposable API child. Replace external provider traffic at the fetch boundary.
import { generateKeyPairSync, sign } from "node:crypto";
import { writeFileSync } from "node:fs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const keyId = "kipivo-e2e";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function googleIdToken() {
  const iat = Math.floor(Date.now() / 1000);
  const claims = encode({
    iss: "https://accounts.google.com",
    aud: process.env.GOOGLE_CLIENT_ID,
    sub: "google-e2e-user",
    email: "google-oauth@example.com",
    email_verified: true,
    name: "Google Test Account",
    iat,
    exp: iat + 600,
  });
  const payload = `${encode({ alg: "RS256", kid: keyId })}.${claims}`;
  return `${payload}.${sign("RSA-SHA256", Buffer.from(payload), privateKey).toString("base64url")}`;
}

const fetchOriginal = globalThis.fetch;
globalThis.fetch = Object.assign(async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  switch (url) {
    case "https://api.resend.com/emails":
      writeFileSync(process.env.E2E_MAIL_FILE, init.body, { mode: 0o600 });
      return Response.json({ id: "local-delivery" });
    case "https://oauth2.googleapis.com/token":
      return Response.json({ access_token: "google-test-token", id_token: googleIdToken() });
    case "https://www.googleapis.com/oauth2/v3/certs":
      return Response.json({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: keyId }] });
    case "https://github.com/login/oauth/access_token":
      return Response.json({ access_token: "github-test-token", scope: "read:user,user:email" });
    case "https://api.github.com/user":
      return Response.json({ id: 12345, login: "github-e2e", name: "GitHub Test Account" });
    case "https://api.github.com/user/emails":
      return Response.json([{ email: "github-oauth@example.com", primary: true, verified: true }]);
    default:
      return fetchOriginal(input, init);
  }
}, fetchOriginal);
