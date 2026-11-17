import { Wordmark } from "@kipivo/ui";
import { Button } from "@kipivo/ui/components/button";
import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import { Suspense, useEffect, useRef, useState } from "react";
import logo from "../../../assets/logo.svg";
import { pages } from "./pages";

const navigation = [{ id: "theme", title: "Theme & colors" }, ...pages];

function currentPage() {
  const id = location.hash.slice(1);
  return navigation.some((page) => page.id === id) ? id : "button";
}

export function App() {
  const [pageId, setPageId] = useState(currentPage);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const heading = useRef<HTMLHeadingElement>(null);
  const page = pages.find((item) => item.id === pageId);
  useEffect(() => {
    function changePage() {
      setPageId(currentPage());
      window.scrollTo(0, 0);
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    }
    window.addEventListener("hashchange", changePage);
    return () => window.removeEventListener("hashchange", changePage);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("kipivo-ui-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  useEffect(() => {
    document.title = `${page?.title ?? "Theme & colors"} · Kipivo UI`;
  }, [page]);

  return (
    <TooltipProvider>
      <a
        className="docs-skip"
        href="#content"
        onClick={(event) => {
          event.preventDefault();
          const content = document.getElementById("content");
          content?.focus();
          content?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a
            href="#button"
            className="rounded-sm outline-ring focus-visible:outline-2"
            aria-label="Kipivo UI home"
          >
            <Wordmark logo={logo} name="Kipivo UI" />
          </a>
          <div role="group" aria-label="Color theme" className="flex items-center gap-1">
            <Button size="sm" variant="ghost" aria-pressed={!dark} onClick={() => setDark(false)}>
              Light
            </Button>
            <Button size="sm" variant="ghost" aria-pressed={dark} onClick={() => setDark(true)}>
              Dark
            </Button>
          </div>
          <label className="flex w-full items-center gap-3 text-sm md:hidden">
            Component
            <select
              className="docs-select flex-1"
              value={pageId}
              onChange={(event) => {
                location.hash = event.target.value;
              }}
            >
              {navigation.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden h-[calc(100dvh-5rem)] overflow-y-auto border-r border-border px-6 py-10 md:block">
          <nav aria-label="Components" className="grid gap-1">
            <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">Foundations</p>
            <NavLink id="theme" title="Theme & colors" current={pageId} />
            <NavLink id="wordmark" title="Wordmark" current={pageId} />
            <p className="mt-7 mb-2 px-3 text-xs font-medium text-muted-foreground">Components</p>
            {pages
              .filter((item) => item.id !== "wordmark")
              .map((item) => (
                <NavLink key={item.id} {...item} current={pageId} />
              ))}
          </nav>
        </aside>
        <main
          id="content"
          tabIndex={-1}
          className="min-w-0 px-5 py-10 outline-none sm:px-8 md:px-12 md:py-12"
        >
          <div className="mx-auto max-w-3xl">
            <h1
              ref={heading}
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight outline-none"
            >
              {page?.title ?? "Theme & colors"}
            </h1>
            <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
              {page?.description ??
                "Warm white and charcoal surfaces, coral actions, and amber accents. These are the same tokens used by the application."}
            </p>
            {page ? (
              <div key={page.id} className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10">
                <Suspense
                  fallback={
                    <div
                      className="h-64 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
                      role="status"
                    >
                      <span className="sr-only">Loading example…</span>
                    </div>
                  }
                >
                  <page.Story />
                </Suspense>
                <section aria-labelledby="usage-heading">
                  <h2 id="usage-heading" className="mb-4 text-lg font-semibold">
                    Usage
                  </h2>
                  <CodeBlock code={page.code} />
                </section>
                <section aria-labelledby="guidance-heading">
                  <h2 id="guidance-heading" className="mb-3 text-lg font-semibold">
                    Guidance
                  </h2>
                  <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {page.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <Palette />
            )}
            <footer className="mt-14 border-t border-border pt-5 text-xs text-muted-foreground">
              Kipivo UI · shadcn / Base UI · Fumadocs Story
            </footer>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

function NavLink({ id, title, current }: { id: string; title: string; current: string }) {
  return (
    <a
      href={`#${id}`}
      aria-current={current === id ? "page" : undefined}
      className="rounded-lg px-3 py-2 text-sm text-muted-foreground outline-ring hover:bg-muted hover:text-foreground focus-visible:outline-2 aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-secondary-foreground"
    >
      {title}
    </a>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">React / TypeScript</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setMessage("Copied");
            } catch {
              setMessage("Select the code to copy it.");
            }
          }}
        >
          Copy code
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6" tabIndex={0}>
        <code>{code}</code>
      </pre>
      <p role="status" className={message ? "px-4 pb-3 text-xs text-muted-foreground" : "sr-only"}>
        {message}
      </p>
    </div>
  );
}

function Palette() {
  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10">
      <section aria-labelledby="semantic-heading">
        <h2 id="semantic-heading" className="mb-5 text-lg font-semibold">
          Semantic colors
        </h2>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {[
            "background",
            "foreground",
            "card",
            "popover",
            "primary",
            "primary-hover",
            "secondary",
            "muted",
            "muted-foreground",
            "accent",
            "destructive",
            "border",
            "input",
            "ring",
          ].map((token) => (
            <div key={token} className="flex items-center gap-3">
              <span
                className="size-10 shrink-0 rounded-lg border border-border"
                style={{ background: `var(--${token})` }}
                aria-hidden="true"
              />
              <dt className="font-mono text-xs">{token}</dt>
              <dd className="sr-only">Shared theme token</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="mb-4 text-lg font-semibold">
          Chart palette
        </h2>
        <ul className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((index) => (
            <li key={index} className="grid gap-2 text-center">
              <span
                className="h-20 rounded-lg"
                style={{ background: `var(--chart-${index})` }}
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-muted-foreground">chart-{index}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-3 text-lg font-semibold">
          Check both themes
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use Light and Dark to compare each component. Check hover and keyboard focus, disabled and
          loading actions, and invalid fields. Decorative borders stay subtle; input borders and
          focus rings use stronger tokens.
        </p>
      </section>
      <CodeBlock
        code={
          '@import "@kipivo/ui/globals.css";\n@source ".";\n\n/* Add .dark to the document element for dark mode. */'
        }
      />
    </div>
  );
}
