import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import type { ReactNode } from "react";
import logo from "@assets/logo.svg?no-inline";
import { docsBase } from "../../mount";
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh font-sans antialiased">
        <RootProvider
          components={{ Link: DocsLink }}
          search={{ options: { type: "static", api: `${docsBase}/search.json` } }}
        >
          {children}
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <title>Page not found | Kipivo Docs</title>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <a className="mt-4 inline-block underline" href={docsBase}>
        Back to documentation
      </a>
    </main>
  );
}
