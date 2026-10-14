import type { Metadata } from "next";
import { BreathingsPage } from "@/components/content/pages";

export const metadata: Metadata = { title: "Respiraciones" };

export default function Page() {
  return <BreathingsPage />;
}
