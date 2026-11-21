import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { Assembly } from "@/features/brand/assembly";
import { ThemeSwitch } from "@kipivo/ui/components/theme-provider";
import { HomeLink } from "@/layout/home-link";
import { m } from "@kipivo/i18n/messages";
import type { ReactNode } from "react";
import { LanguageSelect } from "@/features/i18n/language-select";

export const Route = createFileRoute("/(auth)")({ component: AuthLayout });

function themeLabels() {
  return {
    label: m.themeLabel(),
    light: m.themeLight(),
    dark: m.themeDark(),
    system: m.themeSystem(),
  };
}

function AuthLayout() {
  const brandPanel = useMatches({
    select: (matches) => matches.at(-1)?.staticData.brandPanel,
  });
  const languageSwitch = useMatches({
    select: (matches) => matches.at(-1)?.staticData.languageSwitch,
  });

  if (brandPanel) {
    return (
      <BrandedAuthLayout
        actions={
          languageSwitch ? (
            <div className="flex items-center gap-2">
              <LanguageSelect />
              <ThemeSwitch labels={themeLabels()} />
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <main className="relative flex min-h-svh flex-col">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:right-[max(1.5rem,env(safe-area-inset-right))]">
        <ThemeSwitch labels={themeLabels()} />
      </div>
      <div className="page-gutter my-auto pt-[calc(5rem+env(safe-area-inset-top))] pb-20 [--page-max-width:76rem]">
        <div className="mx-auto max-w-[26rem]">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

function BrandedAuthLayout({ actions }: { actions?: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_65%_0%,color-mix(in_oklab,var(--color-brand-coral)_8%,transparent),transparent_60%)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-[max(1.5rem,env(safe-area-inset-top))]">
        <HomeLink />
        {actions ?? <ThemeSwitch labels={themeLabels()} />}
      </div>
      <div className="mx-auto flex w-full max-w-[71rem] flex-1 items-center px-6 pt-8 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-8 md:pt-10 md:pb-16 lg:px-10">
        <div className="mx-auto grid w-full max-w-[25rem] md:max-w-none md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:rounded-[1.5rem] md:border md:bg-card md:p-2.5 md:shadow-xl md:shadow-black/5 dark:md:shadow-black/20">
          <div className="flex items-center justify-center md:px-7 md:py-9 lg:px-10 lg:py-12">
            <div className="w-full max-w-[23rem]">
              <Outlet />
            </div>
          </div>
          <aside
            aria-label={m.brandAbout()}
            className="hidden flex-col justify-center overflow-hidden rounded-2xl border border-plate-border bg-[#201f1e] text-on-plate md:flex"
          >
            <Assembly className="rounded-none border-0" />
            <div className="border-t border-white/10 px-6 py-5 lg:px-8 lg:py-6">
              <p className="font-heading text-2xl font-semibold tracking-tight">
                {m.brandTagline()}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-on-plate/75">
                {m.brandDescription()}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
