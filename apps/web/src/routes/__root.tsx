import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import { CloudflareAnalytics } from "@/cloudflare-analytics";
import { AccountProvider } from "@/features/account/session";
import { ThemeHead, ThemeProvider } from "@/features/theme/appearance";
import { NotFound } from "@/features/errors/not-found";
import "@/styles/globals.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="dark bg-background font-sans text-foreground has-data-[public-frame]:scrollbar-gutter-stable"
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <ThemeHead />
      </head>
      <body className="min-h-svh">
        <ThemeProvider>
          <TooltipProvider>
            <AccountProvider>{children}</AccountProvider>
          </TooltipProvider>
        </ThemeProvider>
        <CloudflareAnalytics />
        <Scripts />
      </body>
    </html>
  );
}
