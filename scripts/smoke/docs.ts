import assert from "node:assert/strict";
import { extname, join } from "node:path";
import { ROOT } from "../internal/root";

const docsBase = "/docs";
const chineseLocale = "zh-CN";
const chineseSuffix = `.${chineseLocale}`;

export function readGuidePaths(directory = join(ROOT, "apps/docs/content/docs")) {
  // Use source filenames: the Fumadocs loader can return English content at a Chinese URL.
  const files = new Set([...new Bun.Glob("**/*.{md,mdx}").scanSync({ cwd: directory })].sort());
  const missing = [];
  const paths = new Map<string, "en" | "zh-CN">();
  for (const file of files) {
    const extension = extname(file);
    const stem = file.slice(0, -extension.length);
    const chinese = stem.endsWith(chineseSuffix);
    const guide = chinese ? stem.slice(0, -chineseSuffix.length) : stem;
    const counterpart = `${guide}${chinese ? "" : chineseSuffix}${extension}`;
    if (!files.has(counterpart)) missing.push(counterpart);

    const slugs = guide.split("/").filter((segment) => !/^\(.+\)$/.test(segment));
    if (slugs.at(-1) === "index") slugs.pop();
    const path = [docsBase, ...(chinese ? [chineseLocale] : []), ...slugs.map(encodeURI)].join("/");
    assert.ok(!paths.has(path), `Duplicate Docs guide path ${path} from ${file}`);
    paths.set(path, chinese ? chineseLocale : "en");
  }
  assert.ok(missing.length === 0, `Missing Docs source files:\n  ${missing.join("\n  ")}`);
  assert.ok(paths.has(docsBase), "Missing Docs home guide");
  return paths;
}

async function pageLinks(html: string) {
  const hrefs = new Set<string>();
  const ids = new Set<string>();
  await new HTMLRewriter()
    .on("a[href]", {
      element(element) {
        hrefs.add(element.getAttribute("href")!);
      },
    })
    .on("[id]", {
      element(element) {
        ids.add(element.getAttribute("id")!);
      },
    })
    .transform(new Response(html))
    .text();
  return { hrefs, ids };
}

export async function verifyDocs(origin: URL | string) {
  async function request(path: string, status = 200) {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, status, `GET ${path}`);
    return response;
  }

  const guides = readGuidePaths();
  const pages = new Map(
    await Promise.all(
      [...guides].map(async ([path, locale]) => {
        const html = await (await request(path)).text();
        assert.match(html, new RegExp(`<html\\b[^>]*lang="${locale}"`), `${path} page language`);
        return [path, { html, ...(await pageLinks(html)) }] as const;
      }),
    ),
  );

  for (const [path, { hrefs }] of pages) {
    const page = new URL(path, origin);
    for (const href of hrefs) {
      const target = new URL(href, page);
      if (target.origin !== page.origin) continue;
      if (target.pathname !== docsBase && !target.pathname.startsWith(`${docsBase}/`)) continue;

      const destination = pages.get(target.pathname);
      assert.ok(destination, `${path} links to missing guide ${href}`);
      assert.equal(
        guides.get(target.pathname),
        guides.get(path),
        `${path} links across languages to ${href}`,
      );
      if (target.hash) {
        assert.ok(
          destination.ids.has(decodeURIComponent(target.hash.slice(1))),
          `${path} links to missing anchor ${href}`,
        );
      }
    }
  }

  const home = pages.get("/docs")!.html;
  assert.match(home, /<h1\b[^>]*>Kipivo documentation<\/h1>/);
  assert.match(home, /href="\/docs"/);
  assert.doesNotMatch(home, /href="\/docs\/"/);

  const stylesheet = home.match(/href="(\/docs\/assets\/[^"\s]+\.css)"/)?.[1];
  assert.ok(stylesheet, "The docs home references its stylesheet under /docs");
  assert.match((await request(stylesheet)).headers.get("content-type") ?? "", /^text\/css\b/);

  const quickstart = pages.get("/docs/quickstart")!.html;
  assert.match(quickstart, /<h1\b[^>]*>Quickstart<\/h1>/);
  const chinese = pages.get("/docs/zh-CN/quickstart")!.html;
  assert.match(chinese, /<h1\b[^>]*>快速开始<\/h1>/);
  assert.match(chinese, /href="\/docs\/zh-CN\/local-runner"/);
  const searchIndex = await (await request("/docs/search.json")).json();
  assert.ok(searchIndex && typeof searchIndex === "object" && "type" in searchIndex);
  assert.equal(searchIndex.type, "advanced");
  assert.ok("i18n" in searchIndex && searchIndex.i18n === true);
  await request("/docs/missing-guide", 404);
}

if (import.meta.main) {
  const origin = process.argv[2] ?? "http://127.0.0.1:4321";
  await verifyDocs(origin);
  console.log(
    `Verified bilingual guides, localized links, styles, search index, and missing pages at ${origin}`,
  );
}
