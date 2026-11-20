import { expect, it } from "vitest";
import { resolveAuthSettings } from "./env";

const env = {
  AUTH_URL: "https://kipivo.example",
  AUTH_SECRET: "testing-secret-at-least-32-characters",
};

it.each([
  ["HTTPS://xn--bcher-kva.example:8443/", "https://xn--bcher-kva.example:8443"],
  ["http://[::1]:8080/", "http://[::1]:8080"],
])("normalizes the public origin %s", (AUTH_URL, baseURL) => {
  expect(resolveAuthSettings({ ...env, AUTH_URL }, true)?.baseURL).toBe(baseURL);
});

it.each([
  "https://bücher.example",
  "https://kipivo.example/path",
  "https://user@kipivo.example",
  "https://kipivo.example:65536",
])("rejects an unsupported public origin %s", (AUTH_URL) => {
  expect(() => resolveAuthSettings({ ...env, AUTH_URL }, true)).toThrow(/AUTH_URL.*ASCII Punycode/);
});

it("uses host-only cookies by default and trusts exact origins on the same host", () => {
  expect(
    resolveAuthSettings({ ...env, AUTH_TRUSTED_ORIGINS: "https://kipivo.example:8443" }, true),
  ).toMatchObject({
    baseURL: env.AUTH_URL,
    trustedOrigins: [env.AUTH_URL, "https://kipivo.example:8443"],
  });
  expect(resolveAuthSettings(env, true)?.cookieDomain).toBeUndefined();
});

it("requires a shared cookie domain for an additional interactive hostname", () => {
  expect(() =>
    resolveAuthSettings({ ...env, AUTH_TRUSTED_ORIGINS: "https://www.kipivo.example" }, true),
  ).toThrow(/AUTH_COOKIE_DOMAIN/);
});

it.each(["https", "http"])("allows shared cookies across trusted %s subdomains", (scheme) => {
  const primary = `${scheme}://kipivo.example`;
  const alternate = `${scheme}://www.kipivo.example:8443`;
  expect(
    resolveAuthSettings(
      {
        ...env,
        AUTH_URL: primary,
        AUTH_TRUSTED_ORIGINS: alternate,
        AUTH_COOKIE_DOMAIN: "kipivo.example",
      },
      true,
    ),
  ).toMatchObject({
    baseURL: primary,
    cookieDomain: "kipivo.example",
    trustedOrigins: [primary, alternate],
  });
});

it.each([
  ["http://www.kipivo.example", /same scheme/],
  ["https://not-kipivo.example", /shared parent hostname/],
])("rejects %s in shared-cookie mode", (origin, message) => {
  expect(() =>
    resolveAuthSettings(
      { ...env, AUTH_TRUSTED_ORIGINS: origin, AUTH_COOKIE_DOMAIN: "kipivo.example" },
      true,
    ),
  ).toThrow(message);
});

it.each(["co.uk", "github.io"])("rejects the public cookie suffix %s", (suffix) => {
  expect(() =>
    resolveAuthSettings(
      {
        ...env,
        AUTH_URL: `https://app.${suffix}`,
        AUTH_COOKIE_DOMAIN: suffix,
      },
      true,
    ),
  ).toThrow(/shared parent hostname/);
});

it("requires the same scheme on additional host-only origins", () => {
  expect(() =>
    resolveAuthSettings(
      {
        ...env,
        AUTH_TRUSTED_ORIGINS: "http://kipivo.example:8080",
      },
      true,
    ),
  ).toThrow(/same scheme/);
});
