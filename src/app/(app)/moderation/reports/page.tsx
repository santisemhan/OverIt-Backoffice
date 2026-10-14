import type { Metadata } from "next";
import { ReportsView } from "./ReportsView";

export const metadata: Metadata = { title: "Reportes y feedback" };

export default function Page() {
  return <ReportsView />;
}
