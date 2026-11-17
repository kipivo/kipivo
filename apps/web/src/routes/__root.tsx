import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kipivo — From spark to done." },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark bg-background font-sans text-foreground">
      <head>
        <HeadContent />
      </head>
      <body className="grid min-h-svh place-items-center">
        <TooltipProvider>{children}</TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}
