import { Page, PageTitle } from "@kipivo/ui/blocks/page";
import { buttonVariants } from "@kipivo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { AppFrame } from "@/layout/frame";

// An open circuit: the two board traces stop just short of connecting.
function OpenCircuit() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 184"
      fill="none"
      className="mb-8 w-full max-w-[30rem] text-primary"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.35" strokeDasharray="3 6">
        <path d="M12 34h536M12 148h536M124 15v150M435 15v150" />
      </g>
      <g stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="m173 37-53 76h85m-19-65v97" />
        <path d="M311 74V60a26 26 0 0 0-26-26h-15a26 26 0 0 0-26 26v60a26 26 0 0 0 26 26h15a26 26 0 0 0 26-26v-18" />
        <path d="m407 37-53 76h85m-19-65v97" />
      </g>
      <g stroke="currentColor" strokeWidth="2">
        <path d="M10 131h48l20-18h34M448 113h36l25 22h41" />
        <circle cx="10" cy="131" r="3" />
        <circle cx="550" cy="135" r="3" />
      </g>
    </svg>
  );
}

export function NotFound() {
  return (
    <AppFrame>
      <title>404: Page not found | Kipivo</title>
      <Page className="my-auto flex flex-col items-center text-center">
        <OpenCircuit />
        <PageTitle>
          <span className="sr-only">404: </span>Page not found.
        </PageTitle>
        <p className="mt-4 max-w-[40ch] leading-relaxed text-muted-foreground">
          There’s no page at this address. Check the link or pick up where you left off in your
          workbench.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonVariants({ size: "lg" })}>
            Back to home
          </Link>
          <Link to="/workbench" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Open workbench
          </Link>
        </div>
      </Page>
    </AppFrame>
  );
}
