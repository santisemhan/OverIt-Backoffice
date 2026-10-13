import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export async function generateMetadata({ params }: PageProps<"/trackeo/usuarios/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Usuario #${id}` };
}

export default async function Page({ params }: PageProps<"/trackeo/usuarios/[id]">) {
  const { id } = await params;
  return (
    <SectionPlaceholder
      area="trackeo"
      section="usuarios"
      title={`Usuario #${decodeURIComponent(id)}`}
      sub="Su camino en una línea y las pestañas Onboarding, Progreso, Recursos, Ninety, Suscripción y Comunidad."
      filters={false}
      back={{ label: "Usuarios", href: "/trackeo/usuarios" }}
    />
  );
}
