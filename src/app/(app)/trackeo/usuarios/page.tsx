import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Usuarios" };

export default function Page() {
  return <SectionPlaceholder area="trackeo" section="usuarios" />;
}
