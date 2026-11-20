import { createRouter } from "@tanstack/react-router";
import { docsBase } from "../mount";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    rewrite: {
      input: ({ url }) => {
        const pathname = url.pathname.toLowerCase();
        if (pathname === docsBase || pathname.startsWith(`${docsBase}/`)) {
          url.pathname = url.pathname.slice(docsBase.length) || "/";
        }
        return url;
      },
      output: ({ url }) => {
        url.pathname = url.pathname === "/" ? docsBase : `${docsBase}${url.pathname}`;
        return url;
      },
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
