import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import ContaClient from "./ContaClient";
import LogoutButton from "@/app/painel/LogoutButton";
import { T } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default async function MeusIngressosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: comprador }, { data: org }, { data: ingressos }] = await Promise.all([
    supabase.from("comprador").select("nome, cpf, telefone").eq("id", user.id).maybeSingle(),
    supabase.from("organizador").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("ingresso")
      .select("id, codigo, token_assinado, status, criado_em, dono_nome, lote:lote_id(nome), evento:evento_id(titulo, data_inicio, local_nome, slug)")
      .eq("comprador_id", user.id)
      .order("criado_em", { ascending: false }),
  ]);

  if (!comprador) redirect("/entrar");

  // Detect login provider — user.identities[].provider ("email" | "google" | ...)
  const isGoogleUser = user.identities?.some((i) => i.provider === "google") ?? false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const lista = ingressos ?? [];
  const proximos = lista.filter((i) => i.evento?.data_inicio && new Date(i.evento.data_inicio) >= hoje);
  const historico = lista.filter((i) => i.evento?.data_inicio && new Date(i.evento.data_inicio) < hoje);

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0, minWidth: 130 }}>
            <img src="/ingressa_logo_header.png" alt="Ingressa" width={130} style={{ display: "block", height: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {!!org && (
              <Link href="/painel" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>
                Painel de organizador
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(36px,5vw,64px) clamp(20px,5vw,48px)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.coral, marginBottom: 10 }}>Minha conta</p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(26px,4vw,38px)", fontWeight: 600, letterSpacing: "-0.03em", color: T.ink, margin: "0 0 32px" }}>
          Olá, {comprador.nome}!
        </h1>

        <ContaClient
          proximos={proximos}
          historico={historico}
          comprador={{
            nome: comprador.nome ?? "",
            cpf: comprador.cpf ?? "",
            telefone: comprador.telefone ?? "",
            email: user.email ?? "",
          }}
          isGoogleUser={isGoogleUser}
        />
      </main>
    </div>
  );
}
