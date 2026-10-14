import type { Metadata } from "next";
import { ChallengesPage } from "@/components/content/ChallengesPage";

export const metadata: Metadata = { title: "Retos diarios" };

export default function Page() {
  return <ChallengesPage />;
}
