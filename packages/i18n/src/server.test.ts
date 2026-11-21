import { describe, expect, it } from "vitest";
import { paraglideMiddleware } from "@kipivo/i18n/server";

async function negotiate(headers: Record<string, string>) {
  const response = await paraglideMiddleware(
    new Request("http://localhost/sign-in", { headers }),
    ({ locale }) => new Response(locale),
  );
  return { locale: await response.text(), vary: response.headers.get("vary") };
}

describe("paraglideMiddleware locale negotiation", () => {
  it("prefers the remembered locale over the browser preference", async () => {
    const result = await negotiate({ cookie: "locale=zh-CN", "accept-language": "en" });
    expect(result.locale).toBe("zh-CN");
  });

  it("ignores an unknown remembered locale", async () => {
    const result = await negotiate({ cookie: "locale=fr", "accept-language": "zh-CN" });
    expect(result.locale).toBe("zh-CN");
  });

  it("uses the browser preference with quality values", async () => {
    const result = await negotiate({ "accept-language": "en;q=0.4, zh-CN;q=0.9" });
    expect(result.locale).toBe("zh-CN");
  });

  it("falls back to the base locale without signals", async () => {
    const result = await negotiate({});
    expect(result.locale).toBe("en");
  });

  it("marks the response as varying on cookies and language", async () => {
    const result = await negotiate({});
    expect(result.vary).toContain("Cookie");
    expect(result.vary).toContain("Accept-Language");
  });

  it("isolates concurrent requests", async () => {
    const [chinese, english] = await Promise.all([
      negotiate({ cookie: "locale=zh-CN", "accept-language": "en" }),
      negotiate({ cookie: "locale=en", "accept-language": "zh-CN" }),
    ]);
    expect(chinese.locale).toBe("zh-CN");
    expect(english.locale).toBe("en");
  });
});
