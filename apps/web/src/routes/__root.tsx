import { defaultTheme, ThemeHead, ThemeProvider } from "@kipivo/ui/components/theme-provider";
import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useLayoutEffect, type ReactNode } from "react";
import { CloudflareAnalytics } from "@/cloudflare-analytics";
import { AccountProvider } from "@/features/account/session";
import { NotFound } from "@/features/errors/not-found";
import { getLocale, LocaleProvider, useLocale } from "@/features/i18n/locale";
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

/** Keep the document language in sync when the locale changes without a reload. */
function DocumentLanguage() {
  const locale = useLocale();
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

function RootDocument({ children }: { children: ReactNode }) {
  const locale = getLocale();
  return (
    <html
      lang={locale}
      className={`${defaultTheme} bg-background font-sans text-foreground has-data-[public-frame]:scrollbar-gutter-stable`}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        <ThemeHead />
      </head>
      <body className="min-h-svh">
        <ThemeProvider>
          <TooltipProvider>
            <LocaleProvider initialLocale={locale}>
              <DocumentLanguage />
              <AccountProvider>{children}</AccountProvider>
            </LocaleProvider>
          </TooltipProvider>
        </ThemeProvider>
        <CloudflareAnalytics />
        <Scripts />
      </body>
    </html>
  );
}
