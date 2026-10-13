"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  clearSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeToSession,
  writeSession,
  type Session,
} from "@/lib/session";
import { ToastProvider } from "./ui/Toast";
import { TooltipLayer } from "./ui/Tooltip";

interface AuthContextValue {
  session: Session | null;
  /** False during server render and the first hydration pass, when the cookie is unreadable. */
  ready: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const subscribeToMount = () => () => {};

export const LOGIN_PATH = "/login";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The session cookie is an external store: subscribe to it instead of mirroring it into state.
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
  // Distinguishes "no session" from "not read yet", so guards do not redirect on the server pass.
  const ready = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: false,
            refetchOnWindowFocus: true,
            // Filters and paging keep the current result visible while the next one loads.
            placeholderData: keepPreviousData,
          },
        },
      }),
  );

  // Clearing on every auth boundary prevents a previous account's cached data from flashing for the next one.
  const signIn = useCallback(
    (next: Session) => {
      queryClient.clear();
      writeSession(next);
    },
    [queryClient],
  );
  const signOut = useCallback(() => {
    queryClient.clear();
    clearSession();
  }, [queryClient]);

  const value = useMemo(() => ({ session, ready, signIn, signOut }), [session, ready, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipLayer />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

/**
 * Sends anyone without an Admin session to /login (remembering where they were going). A convenience, not a
 * security boundary: the API authorises every request on its own.
 */
export function useRequireAdmin() {
  const { session, ready } = useAuth();
  const router = useRouter();
  const shouldRedirect = ready && (!session || session.role !== "Admin");

  useEffect(() => {
    if (!shouldRedirect) return;
    const here = window.location.pathname + window.location.search;
    router.replace(here && here !== "/" ? `${LOGIN_PATH}?next=${encodeURIComponent(here)}` : LOGIN_PATH);
  }, [shouldRedirect, router]);

  return { session: shouldRedirect ? null : session, ready };
}
