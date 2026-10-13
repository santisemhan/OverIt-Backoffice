import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Frases" };

export default function Page() {
  return <SectionPlaceholder area="contenido" section="frases" />;
}
