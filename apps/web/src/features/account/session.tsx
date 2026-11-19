import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { accountClient, errorStatus, type CurrentAccount } from "./client";

type AccountSession =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "unavailable" }
  | { status: "signed-in"; account: CurrentAccount };

const SessionContext = createContext<{
  session: AccountSession;
  refresh(): Promise<AccountSession | undefined>;
  clearSession(): void;
} | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession>({ status: "loading" });
  const request = useRef<AbortController>(undefined);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;

    let next: AccountSession;
    try {
      const api = await accountClient();
      const options = { signal: controller.signal };
      if (await api.auth.getSession(undefined, options)) {
        const account = await api.account.me(undefined, options);
        next = { status: "signed-in", account };
      } else {
        next = { status: "signed-out" };
      }
    } catch (error) {
      next = { status: errorStatus(error) === 401 ? "signed-out" : "unavailable" };
    }

    if (controller.signal.aborted) return;
    setSession(next);
    return next;
  }, []);

  const clearSession = useCallback(() => {
    request.current?.abort();
    setSession({ status: "signed-out" });
  }, []);

  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ session, refresh, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useAccountSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("AccountProvider is required.");
  return value;
}
