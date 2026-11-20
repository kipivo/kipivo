import type { ReactNode } from "react";
import { AccountControl } from "@/features/account/control";
import { ThemeSwitch } from "@kipivo/ui/components/theme-provider";

export function HeaderActions({ children = <ThemeSwitch /> }: { children?: ReactNode }) {
  return (
    <div className="ms-auto flex min-h-9 items-center gap-2 sm:gap-3">
      {children}
      <AccountControl className="h-auto self-stretch rounded-full" />
    </div>
  );
}
