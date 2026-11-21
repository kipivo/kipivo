import { defaultTheme, ThemeHead, ThemeProvider } from "@kipivo/ui/components/theme-provider";
import { HeadContent, Scripts, createRootRoute, useParams } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import type { ReactNode } from "react";
import logo from "@assets/logo.svg?no-inline";
import { docsBase } from "../../mount";
import { chineseLabels, guidePath, guideUrl } from "../language";
import { DocsLink } from "../link";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: logo }],
  }),
  shellComponent: Document,
  notFoundComponent: NotFound,
});

function Document({ children }: { children: ReactNode }) {
  const { _splat } = useParams({ strict: false });
  const { language } = guidePath(_splat);
  return (
    <html
      lang={language}
      className={`${defaultTheme} bg-background text-foreground`}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <ThemeHead />
      </head>
      <body className="theme-switch-icons min-h-svh">
        <ThemeProvider>
          <RootProvider
            i18n={{
              locale: language,
              translations: language === "zh-CN" ? chineseLabels : undefined,
            }}
            components={{ Link: DocsLink }}
            search={{ options: { type: "static", api: `${docsBase}/search.json` } }}
            theme={{ enabled: false }}
          >
            {children}
          </RootProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  const { _splat } = useParams({ strict: false });
  const { language } = guidePath(_splat);
  const title = language === "zh-CN" ? "找不到该页面" : "Page not found";
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <title>{`${title} | Kipivo Docs`}</title>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <a className="mt-4 inline-block underline" href={guideUrl([], language)}>
        {language === "zh-CN" ? "返回文档" : "Back to documentation"}
      </a>
    </main>
  );
}
