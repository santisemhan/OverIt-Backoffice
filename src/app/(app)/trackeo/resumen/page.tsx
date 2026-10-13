import type { Metadata } from "next";
import { Resumen } from "./Resumen";

export const metadata: Metadata = { title: "Resumen" };

export default function Page() {
  return <Resumen />;
}
