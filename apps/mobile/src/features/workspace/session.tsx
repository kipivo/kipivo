import { createContext, useContext, useState, type ReactNode } from "react";
import { parseWorkspaceOrigin } from "./address";

const defaultAddress = process.env.EXPO_PUBLIC_KIPIVO_URL;

const WorkspaceContext = createContext<{
  origin: string | null;
  invalidDefault: boolean;
  setAddress: (value: string) => boolean;
} | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState(() => parseWorkspaceOrigin(defaultAddress ?? "", __DEV__));

  function setAddress(value: string) {
    const next = parseWorkspaceOrigin(value, __DEV__);
    if (!next) return false;
    setOrigin(next);
    return true;
  }

  return (
    <WorkspaceContext
      value={{ origin, invalidDefault: !origin && !!defaultAddress?.trim(), setAddress }}
    >
      {children}
    </WorkspaceContext>
  );
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("WorkspaceProvider is missing.");
  return workspace;
}
