import type { Metadata } from "next";
import { CommunityView } from "./CommunityView";

export const metadata: Metadata = { title: "Comunidad" };

export default function Page() {
  return <CommunityView />;
}
