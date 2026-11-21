import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface LocaleRuntime<L extends string = string> {
  getLocale: () => L;
  /** Update the library's locale store; the app owns persistence. */
  setLocale: (locale: L, options?: { reload?: boolean }) => void;
}

export interface LocaleProviderProps {
  children?: ReactNode;
  /** The locale rendered on the server; defaults to the runtime's current locale. */
  initialLocale?: string;
}

export interface LocaleController<L extends string = string> {
  LocaleProvider: (props: LocaleProviderProps) => ReactNode;
  /** The locale this tree renders in. */
  useLocale: () => L;
  /** Change the locale without a reload; the caller persists it. */
  useSetLocale: () => (locale: L) => void;
}

interface LocaleState<L extends string> {
  locale: L;
  change: (locale: L) => void;
}

/**
 * Bind Paraglide's runtime to React. Messages read the locale on every call, so a
 * re-render after `setLocale` switches the whole tree without a document reload.
 */
export function createLocale<L extends string>(runtime: LocaleRuntime<L>): LocaleController<L> {
  const LocaleContext = createContext<LocaleState<L> | null>(null);

  function useLocaleState(): LocaleState<L> {
    const value = useContext(LocaleContext);
    if (value === null) throw new Error("LocaleProvider is required");
    return value;
  }

  function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
    const [locale, setLocaleState] = useState(
      () => (initialLocale as L | undefined) ?? runtime.getLocale(),
    );
    const change = useCallback((next: L) => {
      runtime.setLocale(next, { reload: false });
      setLocaleState(next);
    }, []);
    const value = useMemo(() => ({ locale, change }), [locale, change]);
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
  }

  return {
    LocaleProvider,
    useLocale: () => useLocaleState().locale,
    useSetLocale: () => useLocaleState().change,
  };
}
