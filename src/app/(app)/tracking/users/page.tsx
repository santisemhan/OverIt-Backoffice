import type { Metadata } from "next";
import { Users } from "./Users";

export const metadata: Metadata = { title: "Usuarios" };

export default function Page() {
  return <Users />;
}
