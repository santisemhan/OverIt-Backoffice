import type { Metadata } from "next";
import { RetosPage } from "@/components/contenido/RetosPage";

export const metadata: Metadata = { title: "Retos diarios" };

export default function Page() {
  return <RetosPage />;
}
