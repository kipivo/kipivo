import { Link, useRouter } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { docsBase } from "../mount";

export function DocsLink({
  href,
  prefetch,
  ...props
}: ComponentProps<"a"> & { prefetch?: boolean }) {
  const router = useRouter();
  const [pathAndSearch, hash] = href?.split("#", 2) ?? [];
  const [path, search] = pathAndSearch?.split("?", 2) ?? [];
  if (path !== docsBase && !path?.startsWith(`${docsBase}/`)) {
    return <a href={href} {...props} />;
  }

  // Fumadocs URLs include the mount path. TanStack Link adds it to route paths.
  return (
    <Link
      {...props}
      to={path.slice(docsBase.length) || "/"}
      search={search ? router.options.parseSearch(search) : undefined}
      hash={hash}
      preload={prefetch === false ? false : "intent"}
    />
  );
}
