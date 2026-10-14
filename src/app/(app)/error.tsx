"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={<Icon.alert size={22} />}
      title="Algo salió mal"
      text="No pudimos mostrar esta sección. Probá de nuevo; si sigue pasando, avisá al equipo."
      action={<Button onClick={reset}>Reintentar</Button>}
    />
  );
}
