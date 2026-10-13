import type { Metadata } from "next";
import { FactsPage } from "@/components/contenido/pages";

export const metadata: Metadata = { title: "Datos científicos" };

export default function Page() {
  return <FactsPage />;
}
