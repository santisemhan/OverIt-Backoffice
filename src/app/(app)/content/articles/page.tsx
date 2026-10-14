import type { Metadata } from "next";
import { ResourcesPage } from "@/components/content/pages";

export const metadata: Metadata = { title: "Artículos & Tips" };

export default function Page() {
  return <ResourcesPage />;
}
