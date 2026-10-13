import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState
        title="Esta página no existe"
        text="Puede que el link esté incompleto o que la sección haya cambiado de lugar."
        action={
          <Link href="/trackeo/resumen" className="press text-[14px] font-bold text-purple hover:underline">
            Ir al Resumen
          </Link>
        }
      />
    </div>
  );
}
