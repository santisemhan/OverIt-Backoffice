import type { Metadata } from "next";
import { ReportesView } from "./ReportesView";

export const metadata: Metadata = { title: "Reportes y feedback" };

export default function Page() {
  return <ReportesView />;
}
