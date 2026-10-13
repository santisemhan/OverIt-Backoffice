import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Reportes y feedback" };

export default function Page() {
  return <SectionPlaceholder area="moderacion" section="reportes" />;
}
