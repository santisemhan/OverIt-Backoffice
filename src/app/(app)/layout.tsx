import { Suspense } from "react";
import { AuthGate } from "./AuthGate";

// Server file on purpose: the guard and the shell need hooks, but a client layout could not let pages export
// `metadata` titles cleanly. Suspense is required because the shell reads search params (Tracking filters).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
