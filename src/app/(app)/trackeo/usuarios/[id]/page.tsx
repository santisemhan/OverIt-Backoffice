import type { Metadata } from "next";
import { UserProfile } from "./UserProfile";

export const metadata: Metadata = { title: "Usuario" };

export default async function Page({ params }: PageProps<"/trackeo/usuarios/[id]">) {
  const { id } = await params;
  return <UserProfile id={decodeURIComponent(id)} />;
}
