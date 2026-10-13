import type { Metadata } from "next";
import { Uso } from "./Uso";

export const metadata: Metadata = { title: "Uso de la app" };

export default function Page() {
  return <Uso />;
}
