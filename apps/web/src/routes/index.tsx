import { Page, PageTitle } from "@kipivo/ui/blocks/page";
import { buttonVariants } from "@kipivo/ui/components/button";
import { cn } from "@kipivo/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { requireInstallation } from "@/features/account/install-status";
import { useAccountSession } from "@/features/account/session";
import { Assembly } from "@/features/brand/assembly";
import { BackToTop } from "@/features/home/back-to-top";
import {
  HomeFooter,
  HomeHeaderActions,
  HomeMenu,
  HomeNavigation,
} from "@/features/home/navigation";
import { RunExample } from "@/features/home/run-example";
import { Quickstart } from "@/features/home/quickstart";
import { UmamiAnalytics } from "@/features/home/umami-analytics";
import { WorkspaceGuide } from "@/features/home/workspace-guide";
import { AppFrame } from "@/layout/frame";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Kipivo — From spark to done." }] }),
  beforeLoad: requireInstallation,
  component: Home,
});

function Home() {
  const { session } = useAccountSession();
  const member = session.status === "signed-in";
  const hero = useRef<HTMLElement>(null);
  return (
    <AppFrame menu={<HomeMenu />} navigation={<HomeNavigation />} actions={<HomeHeaderActions />}>
      <Page className="py-0 sm:py-0">
        <section
          ref={hero}
          aria-labelledby="home-title"
          className="relative isolate grid items-center gap-9 py-12 md:grid-cols-[1fr_1fr] md:gap-10 lg:gap-16 lg:py-20
            before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:bg-drafting-grid before:bg-size-[20px_20px,100%_100%]
            before:mask-[linear-gradient(105deg,transparent_10%,#0002_32%,black_72%,#0008)]
            max-md:before:mask-[linear-gradient(180deg,transparent_18%,#0002_38%,#000a_80%,#0004)] print:before:hidden forced-colors:before:hidden
            after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:bg-[linear-gradient(to_right,transparent_43%,var(--primary)_64%)]
            after:mask-drafting-traces after:mask-size-[min(91%,68rem)_auto] after:mask-bottom-right after:mask-no-repeat after:opacity-42
            max-md:after:mask-size-[100%_auto] print:after:hidden forced-colors:after:hidden"
        >
          <div>
            <p className="mb-5 flex items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground">
              <span aria-hidden="true" className="h-px w-7 bg-primary" />
              Developer workspace
            </p>
            <PageTitle
              id="home-title"
              scale="display"
              className="max-w-[9ch] text-[clamp(3.8rem,7vw,6.6rem)] leading-[0.98]"
            >
              From spark to done.
            </PageTitle>
            <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-muted-foreground lg:text-lg">
              Plan tasks on your board, run checks in your local checkout, and read the logs when
              something fails.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Link
                to="/workbench"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-[#121214] px-5 text-[#FAF7F5] hover:bg-[#2A2A2F] dark:border-input",
                )}
              >
                Open workbench
                <span aria-hidden="true">→</span>
              </Link>
              {!member && (
                <Link
                  to="/sign-up"
                  className="control-focus rounded-sm text-sm font-medium underline underline-offset-4"
                >
                  Create an account
                </Link>
              )}
              <a
                href="#example"
                className="control-focus rounded-sm text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-current"
              >
                Explore a sample run
              </a>
            </div>
          </div>
          <Assembly />
        </section>
        <RunExample />
        <Quickstart />
        <WorkspaceGuide />
      </Page>
      <HomeFooter />
      <UmamiAnalytics />
      <BackToTop hero={hero} />
    </AppFrame>
  );
}
