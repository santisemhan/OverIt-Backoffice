import type { Metadata } from "next";
import { Usage } from "./Usage";

export const metadata: Metadata = { title: "Uso de la app" };

export default function Page() {
  return <Usage />;
}
