import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Retos diarios" };

export default function Page() {
  return <SectionPlaceholder area="contenido" section="retos" />;
}
