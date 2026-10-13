import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Suscripciones" };

export default function Page() {
  return <SectionPlaceholder area="trackeo" section="suscripciones" />;
}
