import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDestaqueClient from "./AdminDestaqueClient";

// Proteção: só o e-mail em ADMIN_EMAIL (env var server-only) acessa esta página.
export default async function AdminDestaquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect("/entrar");
  }

  // Lista todos os eventos publicados para gerenciar destaque
  const { data: eventos } = await supabase
    .from("evento")
    .select("id, titulo, slug, local_nome, data_inicio, status, destaque, destaque_admin, destaque_ordem")
    .eq("status", "publicado")
    .eq("visibilidade", "publico")
    .order("data_inicio", { ascending: true });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "clamp(24px,5vw,48px) clamp(16px,4vw,40px)", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>Admin — Eventos em destaque</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px" }}>
          <strong>Forçar ON</strong>: aparece em destaque independente do organizador.<br />
          <strong>Forçar OFF</strong>: bloqueia o destaque do organizador.<br />
          <strong>↺ Org</strong>: devolve o controle ao organizador.
        </p>
        {(!eventos || eventos.length === 0) ? (
          <p style={{ color: "#9ca3af" }}>Nenhum evento publicado encontrado.</p>
        ) : (
          <AdminDestaqueClient eventos={eventos} />
        )}
      </div>
    </div>
  );
}
