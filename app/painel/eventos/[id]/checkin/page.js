import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckinClient from "./CheckinClient";

export const metadata = { title: "Check-in · Ingressa" };

export default async function CheckinPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: evento } = await supabase
    .from("evento")
    .select("id, titulo, status")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();

  if (!evento) notFound();

  return <CheckinClient eventoId={id} eventoTitulo={evento.titulo} />;
}
