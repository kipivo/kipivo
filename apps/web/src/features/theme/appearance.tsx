import { ThemeSelector, type ThemePreference } from "@kipivo/ui/components/theme-selector";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const storageKey = "kipivo-theme";
const defaultTheme = "dark";
const systemQuery = "(prefers-color-scheme: dark)";
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const themeColors = { light: "#fcf9f7", dark: "#111112" };
type Appearance = keyof typeof themeColors;

const ThemeContext = createContext<{
  theme: ThemePreference | undefined;
  selectTheme: (theme: ThemePreference, trigger: HTMLElement, activation?: Event) => void;
} | null>(null);

// The cached HTML uses the default. Apply the browser's preference before the body paints.
// Own theme-color outside React so hydration doesn't duplicate the recolored tag.
const themeScript = `(() => {
  let theme;
  try { theme = localStorage.getItem(${JSON.stringify(storageKey)}); } catch {}
  const dark = theme === "system" ? matchMedia(${JSON.stringify(systemQuery)}).matches : theme !== "light";
  document.documentElement.classList.toggle("dark", dark);
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = dark ? ${JSON.stringify(themeColors.dark)} : ${JSON.stringify(themeColors.light)};
  document.head.append(meta);
})();`;

export function ThemeHead() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

function revealOrigin(trigger: HTMLElement, activation?: Event) {
  if (activation instanceof MouseEvent && activation.detail > 0) {
    return `${activation.clientX}px ${activation.clientY}px`;
  }

  // Keyboard and assistive activations have no pointer position.
  const { left, top, width, height } = trigger.getBoundingClientRect();
  return `${left + width / 2}px ${top + height / 2}px`;
}

function clearReveal() {
  const root = document.documentElement;
  delete root.dataset.themeTransition;
  root.style.removeProperty("--theme-reveal-origin");
}

function readTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
  return defaultTheme;
}

function resolveAppearance(theme: ThemePreference, systemDark: boolean): Appearance {
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}

function applyAppearance(appearance: Appearance) {
  document.documentElement.classList.toggle("dark", appearance === "dark");
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = themeColors[appearance];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>();
  const activeTransition = useRef<ViewTransition | null>(null);
  const cancelTransition = useCallback(() => {
    const transition = activeTransition.current;
    if (!transition) return;

    activeTransition.current = null;
    transition.skipTransition();
    clearReveal();
  }, []);

  useEffect(() => {
    setTheme(readTheme());
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      cancelTransition();
      const nextTheme = readTheme();
      applyAppearance(resolveAppearance(nextTheme, window.matchMedia(systemQuery).matches));
      setTheme(nextTheme);
    };
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("storage", syncStorage);
      cancelTransition();
    };
  }, [cancelTransition]);

  useEffect(() => {
    if (!theme) return;
    const system = window.matchMedia(systemQuery);
    const applyTheme = () => applyAppearance(resolveAppearance(theme, system.matches));
    if (!activeTransition.current) applyTheme();
    if (theme === "system") {
      system.addEventListener("change", applyTheme);
      return () => system.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  function selectTheme(value: ThemePreference, trigger: HTMLElement, activation?: Event) {
    cancelTransition();
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // The current page can still apply the selected theme.
    }

    const root = document.documentElement;
    const system = window.matchMedia(systemQuery);
    const updateAppearance = () => applyAppearance(resolveAppearance(value, system.matches));
    const nextDark = resolveAppearance(value, system.matches) === "dark";
    if (
      typeof document.startViewTransition === "function" &&
      !window.matchMedia(reducedMotionQuery).matches &&
      root.classList.contains("dark") !== nextDark
    ) {
      root.style.setProperty("--theme-reveal-origin", revealOrigin(trigger, activation));
      root.dataset.themeTransition = "";
      try {
        const transition = document.startViewTransition(() => {
          // The callback still runs when a newer selection skips this transition.
          if (activeTransition.current === transition) updateAppearance();
        });
        activeTransition.current = transition;

        const finish = () => {
          if (activeTransition.current !== transition) return;
          activeTransition.current = null;
          clearReveal();
        };
        void transition.ready.catch(() => {});
        void transition.finished.then(finish, finish);
      } catch {
        clearReveal();
      }
    }

    if (!activeTransition.current) updateAppearance();
    // The radio selection responds while the browser captures the previous palette.
    setTheme(value);
  }

  return <ThemeContext.Provider value={{ theme, selectTheme }}>{children}</ThemeContext.Provider>;
}

export function useThemeSelection() {
  const selection = useContext(ThemeContext);
  if (!selection) throw new Error("Theme selection requires ThemeProvider");
  return selection;
}

export function ThemeSwitch() {
  const { theme, selectTheme } = useThemeSelection();
  return (
    <ThemeSelector
      disabled={theme === undefined}
      theme={theme}
      onThemeChange={(value, event) => selectTheme(value, event.currentTarget, event.nativeEvent)}
    />
  );
}
