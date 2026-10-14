import type { Metadata } from "next";
import { HistoryView } from "./HistoryView";

export const metadata: Metadata = { title: "Historial" };

export default function Page() {
  return <HistoryView />;
}
