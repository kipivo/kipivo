import { Wordmark } from "@kipivo/ui";
import logo from "../../../assets/logo.svg?no-inline";

export function HomePage() {
  return (
    <main className="w-full max-w-[68rem] px-[clamp(1.5rem,8vw,6rem)] py-16">
      <Wordmark logo={logo} name="Kipivo" />
      <h1 className="mt-7 max-w-[12ch] text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.98] font-bold tracking-[-0.065em] text-balance">
        From spark to done.
      </h1>
      <p className="mt-6 max-w-[43ch] text-[clamp(1rem,2vw,1.25rem)] leading-[1.6] text-kipivo-muted">
        Kipivo gives developers AI bots that understand their projects, do the work, and show what
        they did.
      </p>
      {import.meta.env.DEV && (
        <a href="/runs" className="mt-8 inline-block font-medium text-kipivo-muted underline">
          Local runs
        </a>
      )}
    </main>
  );
}
