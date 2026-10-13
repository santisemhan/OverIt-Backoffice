import type { Metadata } from "next";
import { Suscripciones } from "./Suscripciones";

export const metadata: Metadata = { title: "Suscripciones" };

export default function Page() {
  return <Suscripciones />;
}
