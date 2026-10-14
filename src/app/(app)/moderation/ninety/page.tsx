import type { Metadata } from "next";
import { NinetyView } from "./NinetyView";

export const metadata: Metadata = { title: "Ninety" };

export default function Page() {
  return <NinetyView />;
}
