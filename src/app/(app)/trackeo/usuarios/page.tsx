import type { Metadata } from "next";
import { Usuarios } from "./Usuarios";

export const metadata: Metadata = { title: "Usuarios" };

export default function Page() {
  return <Usuarios />;
}
