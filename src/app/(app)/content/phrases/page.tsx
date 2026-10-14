import type { Metadata } from "next";
import { PhrasesPage } from "@/components/content/pages";

export const metadata: Metadata = { title: "Frases" };

export default function Page() {
  return <PhrasesPage />;
}
