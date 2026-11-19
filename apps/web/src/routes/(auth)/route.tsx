import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { Assembly } from "@/features/brand/assembly";
import { ThemeSwitch } from "@/features/theme/appearance";

const panelLayouts = {
  desktop:
    "mx-auto grid w-full max-w-[26rem] items-center gap-9 md:max-w-none md:grid-cols-[minmax(0,26rem)_minmax(0,32rem)] md:justify-center md:gap-10 lg:gap-16",
  responsive:
    "mx-auto grid w-full max-w-[26rem] items-center gap-6 @min-[29rem]/signup:max-w-none @min-[29rem]/signup:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @min-[40rem]/signup:gap-12 lg:gap-16",
};

export const Route = createFileRoute("/(auth)")({ component: AuthLayout });

function AuthLayout() {
  const brandPanel = useMatches({
    select: (matches) => matches.at(-1)?.staticData.brandPanel,
  });
  return (
    <main className="relative flex min-h-svh flex-col">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:right-[max(1.5rem,env(safe-area-inset-right))]">
        <ThemeSwitch />
      </div>
      <div className="@container/signup page-gutter my-auto pt-[calc(5rem+env(safe-area-inset-top))] pb-20 [--page-max-width:76rem]">
        <div className={brandPanel ? panelLayouts[brandPanel] : "mx-auto max-w-[26rem]"}>
          <div className="w-full max-w-[26rem]">
            <Outlet />
          </div>
          {brandPanel && (
            <aside
              aria-label="About Kipivo"
              className={
                brandPanel === "desktop"
                  ? "hidden md:block"
                  : `@max-[29rem]/signup:[&>p]:hidden @max-[29rem]/signup:[&_img]:h-36
                     @max-[29rem]/signup:[&_img]:bg-[#201f1e] @max-[29rem]/signup:[&_img]:object-contain`
              }
            >
              <Assembly />
              <p className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                From spark to done.
              </p>
              <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
                Keep a personal task board and manage your account settings.
              </p>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
