import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Uso de la app" };

export default function Page() {
  return <SectionPlaceholder area="trackeo" section="uso" />;
}
