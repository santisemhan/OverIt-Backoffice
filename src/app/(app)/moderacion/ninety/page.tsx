import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export const metadata: Metadata = { title: "Ninety" };

export default function Page() {
  return <SectionPlaceholder area="moderacion" section="ninety" />;
}
