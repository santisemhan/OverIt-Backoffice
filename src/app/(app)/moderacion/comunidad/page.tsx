import type { Metadata } from "next";
import { ComunidadView } from "./ComunidadView";

export const metadata: Metadata = { title: "Comunidad" };

export default function Page() {
  return <ComunidadView />;
}
