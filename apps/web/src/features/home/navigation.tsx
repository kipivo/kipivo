import { baseLocale } from "@kipivo/i18n/runtime";
import { m } from "@kipivo/i18n/messages";
import { ArrowUpRightIcon, CloseIcon, GitHubIcon, MenuIcon } from "@kipivo/icons";
import { Button, buttonVariants } from "@kipivo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@kipivo/ui/components/dialog";
import { cn } from "@kipivo/ui/lib/utils";
import { ThemeSwitch } from "@/features/i18n/theme-switch";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useLocale } from "@/features/i18n/locale";
import { LanguageSelect } from "@/features/i18n/language-select";
import { HeaderActions } from "@/layout/header-actions";
import { HomeLink } from "@/layout/home-link";
import { homeScrollBehavior } from "./scroll";

function useHomeLinks() {
  const locale = useLocale();
  return [
    { href: "#example", label: m.homeExampleRun },
    { href: "#quickstart", label: m.homeQuickstart },
    { href: "#workspace-guide", label: m.homeGuide },
    { href: locale === baseLocale ? "/docs" : `/docs/${locale}`, label: m.homeDocs },
  ];
}

const repositoryUrl = "https://github.com/kipivo/kipivo";

const footerLink =
  "control-focus inline-flex min-h-8 items-center rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline pointer-coarse:min-h-11";

export function HomeNavigation() {
  const homeLinks = useHomeLinks();
  return (
    <nav aria-label={m.homeNavigation()} className="hidden lg:block">
      <ul className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
        {homeLinks.map(({ href, label }) => (
          <li key={href}>
            <a
              href={href}
              className="control-focus inline-flex min-h-8 items-center rounded-lg px-2 whitespace-nowrap transition-colors hover:bg-muted hover:text-foreground xl:px-3 pointer-coarse:min-h-11"
            >
              {label()}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function HomeHeaderActions() {
  return (
    <HeaderActions>
      <div className="theme-switch-icons hidden items-center gap-2 lg:flex xl:gap-3">
        <a
          href={repositoryUrl}
          aria-label="GitHub"
          title="GitHub"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-auto w-[calc(2.25rem+2px)] self-stretch rounded-full text-muted-foreground pointer-coarse:w-[calc(3rem+2px)]",
          )}
        >
          <GitHubIcon strokeWidth={1.8} aria-hidden="true" />
        </a>
        <LanguageSelect />
        <ThemeSwitch />
      </div>
    </HeaderActions>
  );
}

export function HomeMenu() {
  const homeLinks = useHomeLinks();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const destination = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 64rem)");
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open]);

  function selectSection(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    destination.current = event.currentTarget.hash;
    setOpen(false);
  }

  function followSection(visible: boolean) {
    if (visible || !destination.current) return;
    const hash = destination.current;
    // Wait for the dialog to release its focus trap and scroll lock.
    requestAnimationFrame(() => {
      destination.current = null;
      const sectionId = hash.slice(1);
      const section = document.getElementById(sectionId);
      if (!section) return;

      const behavior = homeScrollBehavior();
      section.focus({ preventScroll: true });
      if (window.location.hash === hash) {
        section.scrollIntoView({ behavior });
      } else {
        void navigate({
          to: "/",
          search: true,
          hash: sectionId,
          hashScrollIntoView: { behavior },
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={followSection}>
      <DialogTrigger
        aria-label={m.homeOpenNavigation()}
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="rounded-full lg:hidden"
            disabled={!hydrated}
          />
        }
      >
        <MenuIcon strokeWidth={2} aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        presentation="drawer"
        showCloseButton={false}
        finalFocus={() => (destination.current ? false : true)}
        className="gap-5 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <DialogTitle>{m.homeNavigation()}</DialogTitle>
          <DialogClose
            aria-label={m.homeCloseNavigation()}
            render={<Button variant="ghost" size="icon" className="rounded-full" />}
          >
            <CloseIcon strokeWidth={2} aria-hidden="true" />
          </DialogClose>
        </div>
        <nav aria-label={m.homeNavigation()}>
          <ul className="grid gap-1">
            {homeLinks.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={href.startsWith("#") ? selectSection : undefined}
                  className="control-focus flex min-h-11 items-center rounded-lg px-3 font-medium transition-colors hover:bg-muted"
                >
                  {label()}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-sm font-medium text-muted-foreground">{m.languageLabel()}</span>
          <LanguageSelect />
        </div>
        <div className="theme-switch-icons flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">{m.homeAppearance()}</span>
          <ThemeSwitch />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HomeFooter() {
  const homeLinks = useHomeLinks();
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="page-gutter grid items-center gap-4 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:gap-5 sm:py-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-6">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
          <HomeLink />
          <a
            href={repositoryUrl}
            className={cn(footerLink, "gap-1.5 text-sm text-muted-foreground")}
          >
            <GitHubIcon strokeWidth={1.8} aria-hidden="true" className="size-4" />
            GitHub
            <ArrowUpRightIcon strokeWidth={2} aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        <nav aria-label={m.homeFooter()}>
          <ul className="grid grid-cols-2 gap-x-4 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-x-5">
            <li>
              <Link to="/workbench" className={footerLink}>
                {m.homeWorkbench()}
              </Link>
            </li>
            {homeLinks.map(({ href, label }) => (
              <li key={href}>
                <a href={href} className={footerLink}>
                  {label()}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <small className="text-xs text-muted-foreground lg:justify-self-end">
          © {new Date().getUTCFullYear()} Kipivo
        </small>
      </div>
    </footer>
  );
}
