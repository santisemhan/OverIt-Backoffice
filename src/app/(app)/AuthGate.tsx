"use client";

import { useRequireAdmin } from "@/components/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Spinner } from "@/components/ui/Button";

/** Renders the app only for an Admin session; everyone else is redirected to /login by the hook. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, ready } = useRequireAdmin();

  if (!ready || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-purple" aria-busy="true" aria-label="Cargando">
        <Spinner size={28} />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
