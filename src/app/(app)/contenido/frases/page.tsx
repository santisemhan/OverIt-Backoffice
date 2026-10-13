import type { Metadata } from "next";
import { PhrasesPage } from "@/components/contenido/pages";

export const metadata: Metadata = { title: "Frases" };

export default function Page() {
  return <PhrasesPage />;
}
