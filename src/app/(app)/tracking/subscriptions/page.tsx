import type { Metadata } from "next";
import { Subscriptions } from "./Subscriptions";

export const metadata: Metadata = { title: "Suscripciones" };

export default function Page() {
  return <Subscriptions />;
}
