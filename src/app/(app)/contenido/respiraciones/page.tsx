import type { Metadata } from "next";
import { BreathingsPage } from "@/components/contenido/pages";

export const metadata: Metadata = { title: "Respiraciones" };

export default function Page() {
  return <BreathingsPage />;
}
