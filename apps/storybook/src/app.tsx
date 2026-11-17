import { Wordmark } from "@kipivo/ui";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { TooltipProvider } from "@kipivo/ui/components/tooltip";
import { Suspense, useEffect, useRef, useState } from "react";
import logo from "../../../assets/logo.svg";
import { pages } from "./pages";
import { CodeBlock } from "./copy-button";
import { Palette } from "./palette";
import { PreviewBoundary } from "./preview-boundary";

const navigation = [
  {
    id: "theme",
    title: "Theme & colors",
    description: "Semantic tokens, chart colors, and contrast",
  },
  ...pages,
];

function currentPage() {
  const id = location.hash.slice(1);
  return navigation.some((page) => page.id === id) ? id : "button";
}

export function App() {
  const [pageId, setPageId] = useState(currentPage);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const heading = useRef<HTMLHeadingElement>(null);
  const page = pages.find((item) => item.id === pageId);
  const pageIndex = navigation.findIndex((item) => item.id === pageId);
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
          <SideNavigation current={pageId} />
        </aside>
        <main
          id="content"
          tabIndex={-1}
          className="min-w-0 scroll-mt-32 px-5 py-10 outline-none sm:px-8 md:scroll-mt-20 md:px-12 md:py-12"
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
                <PreviewBoundary>
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
                </PreviewBoundary>
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
            <nav
              aria-label="Adjacent pages"
              className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-5"
            >
              {navigation[pageIndex - 1] ? (
                <PageLink page={navigation[pageIndex - 1]} direction="Previous" />
              ) : (
                <span />
              )}
              {navigation[pageIndex + 1] && (
                <PageLink page={navigation[pageIndex + 1]} direction="Next" />
              )}
            </nav>
            <footer className="mt-10 pb-2 text-xs text-muted-foreground">
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

function SideNavigation({ current }: { current: string }) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const matches = navigation.filter((page) =>
    `${page.title} ${page.description}`.toLowerCase().includes(term),
  );

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.key !== "/" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.defaultPrevented
      )
        return;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [role=dialog], [role=menu]"))
      )
        return;
      if (!search.current?.getClientRects().length) return;
      event.preventDefault();
      search.current.focus();
      search.current.select();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <>
      <div role="search" className="mb-6 grid gap-2">
        <label htmlFor="component-search" className="text-xs font-medium text-muted-foreground">
          Find a component
        </label>
        <Input
          ref={search}
          id="component-search"
          type="search"
          placeholder="Search components…"
          value={query}
          aria-describedby="search-help"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              event.stopPropagation();
            }
            if (event.key === "Enter" && term && matches[0]) {
              location.hash = matches[0].id;
              document.getElementById("content")?.focus();
            }
          }}
        />
        <p id="search-help" className="text-xs text-muted-foreground">
          Press <kbd className="font-mono">/</kbd> to search. Esc clears.
        </p>
      </div>
      <nav aria-label="Components" className="grid gap-1">
        {term ? (
          <>
            <p role="status" className="mb-2 px-3 text-xs text-muted-foreground">
              {matches.length
                ? `${matches.length} ${matches.length === 1 ? "result" : "results"}`
                : "No matching components."}
            </p>
            {matches.map((item) => (
              <NavLink key={item.id} {...item} current={current} />
            ))}
            {!matches.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  search.current?.focus();
                }}
              >
                Clear search
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">Foundations</p>
            <NavLink id="theme" title="Theme & colors" current={current} />
            <NavLink id="wordmark" title="Wordmark" current={current} />
            <p className="mt-7 mb-2 px-3 text-xs font-medium text-muted-foreground">Components</p>
            {pages
              .filter((item) => item.id !== "wordmark")
              .map((item) => (
                <NavLink key={item.id} {...item} current={current} />
              ))}
          </>
        )}
      </nav>
    </>
  );
}

function PageLink({
  page,
  direction,
}: {
  page: { id: string; title: string };
  direction: "Previous" | "Next";
}) {
  return (
    <a
      href={`#${page.id}`}
      className={`grid gap-1 rounded-sm text-sm outline-ring hover:underline focus-visible:outline-2 ${direction === "Next" ? "text-right" : ""}`}
    >
      <span className="text-xs text-muted-foreground">{direction}</span>
      <span className="font-medium underline-offset-4">{page.title}</span>
    </a>
  );
}
