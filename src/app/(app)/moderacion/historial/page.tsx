import type { Metadata } from "next";
import { HistorialView } from "./HistorialView";

export const metadata: Metadata = { title: "Historial" };

export default function Page() {
  return <HistorialView />;
}
