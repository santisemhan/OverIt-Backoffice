import type { Metadata } from "next";
import { FactsPage } from "@/components/content/pages";

export const metadata: Metadata = { title: "Datos científicos" };

export default function Page() {
  return <FactsPage />;
}
