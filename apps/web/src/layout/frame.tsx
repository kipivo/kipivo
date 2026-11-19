import { cn } from "@kipivo/ui/lib/utils";
import type { ReactNode } from "react";
import { HeaderActions } from "./header-actions";
import { HomeLink } from "./home-link";

export function AppFrame({
  children,
  menu,
  navigation,
  actions,
}: {
  children: ReactNode;
  menu?: ReactNode;
  navigation?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div data-public-frame="" className="flex min-h-svh flex-col [--page-max-width:84rem]">
      <header id="top" tabIndex={-1} className="page-gutter">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 sm:py-4",
            !menu && "@container/public-header",
            navigation && "lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-x-6",
          )}
        >
          <div
            className="flex min-w-0 items-center gap-2
              @max-[18.5rem]/public-header:**:data-[slot=wordmark-name]:sr-only
              pointer-coarse:@max-[20.75rem]/public-header:**:data-[slot=wordmark-name]:sr-only"
          >
            {menu}
            <HomeLink />
          </div>
          {navigation}
          {actions ?? <HeaderActions />}
        </div>
      </header>
      {children}
    </div>
  );
}
