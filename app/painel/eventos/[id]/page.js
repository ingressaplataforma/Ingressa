import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PublicarButton from "./PublicarButton";
import PausarButton from "./PausarButton";
import EditarEvento from "./EditarEvento";
import { T, BRL } from "@/lib/tokens";

const fontDisplay = "var(--font-display), Georgia, serif";
const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const STATUS_LABEL = {
  rascunho: { label: "Rascunho", color: T.muted },
  publicado: { label: "Publicado", color: T.mint },
  pausado:   { label: "Pausado", color: "#E67E22" },
  encerrado: { label: "Encerrado", color: T.ink2 },
  cancelado: { label: "Cancelado", color: "#E74C3C" },
};

export default async function EventoDetalhePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: evento } = await supabase
    .from("evento")
    .select("id, titulo, descricao, local_nome, cep, endereco, uf, categoria, data_inicio, data_fim, status, slug, visibilidade, senha_hash, imagem_url, aceita_cartao, aceita_boleto, quem_paga_taxa, lote(id, nome, preco_cents, quantidade_total, quantidade_vendida)")
    .eq("id", id)
    .eq("organizador_id", user.id)
    .maybeSingle();

  if (!evento) notFound();

  const { data: ingressos } = await supabase
    .from("ingresso")
    .select("id, status, criado_em, lote:lote_id(nome), comprador:comprador_id(nome)")
    .eq("evento_id", id)
    .order("criado_em", { ascending: false });

  const dataInicio = new Date(evento.data_inicio);
  const dataFmt = dataInicio.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const horaFmt = dataInicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const st = STATUS_LABEL[evento.status] ?? STATUS_LABEL.rascunho;

  const totalVendidos = (evento.lote ?? []).reduce((s, l) => s + l.quantidade_vendida, 0);
  const totalVagas = (evento.lote ?? []).reduce((s, l) => s + l.quantidade_total, 0);

  const editavel = evento.status === "rascunho" || evento.status === "pausado";

  return (
    <div style={{ minHeight: "100vh", background: T.surface, fontFamily: fontBody }}>
      <header style={{ borderBottom: `1px solid ${T.line}`, background: "#fff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px clamp(20px,5vw,48px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Link href="/painel/eventos" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: T.muted, fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Meus eventos
          </Link>
          {evento.status === "publicado" && (
            <Link href={`/e/${evento.slug}`} target="_blank" style={{ fontSize: 14, fontWeight: 600, color: T.coral, textDecoration: "none" }}>
              Ver página pública ↗
            </Link>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(32px,5vw,56px) clamp(20px,5vw,48px)" }}>
        {/* Título + status + ações */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: `${st.color}18`, padding: "3px 10px", borderRadius: 99, display: "inline-block", marginBottom: 10 }}>
              {st.label}
            </span>
            <h1 style={{ fontFamily: fontDisplay, fontSize: "clamp(24px,4vw,36px)", fontWeight: 600, color: T.ink, margin: 0, letterSpacing: "-0.03em" }}>
              {evento.titulo}
            </h1>
            <p style={{ fontSize: 15, color: T.muted, margin: "8px 0 0" }}>{dataFmt} às {horaFmt}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {editavel && <PublicarButton eventoId={evento.id} />}
            {evento.status === "publicado" && (
              <>
                <Link
                  href={`/painel/eventos/${evento.id}/checkin`}
                  style={{ padding: "12px 22px", background: T.mint, color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 600, display: "inline-block" }}
                >
                  📷 Abrir check-in
                </Link>
                <PausarButton eventoId={evento.id} />
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 36 }}>
          <Stat label="Inscritos" value={totalVendidos} />
          <Stat label="Vagas totais" value={totalVagas} />
          <Stat label="Disponível" value={totalVagas - totalVendidos} />
        </div>

        {/* Formulário de edição (rascunho ou pausado) */}
        {editavel && (
          <EditarEvento
            eventoId={evento.id}
            eventoInicial={{
              titulo: evento.titulo,
              descricao: evento.descricao,
              local_nome: evento.local_nome,
              cep: evento.cep,
              endereco: evento.endereco,
              uf: evento.uf ?? "",
              categoria: evento.categoria ?? "outro",
              data_inicio: evento.data_inicio,
              data_fim: evento.data_fim,
              visibilidade: evento.visibilidade ?? "publico",
              tem_senha: !!evento.senha_hash,
              imagem_url: evento.imagem_url ?? null,
              aceita_cartao: evento.aceita_cartao ?? true,
              aceita_boleto: evento.aceita_boleto ?? false,
            }}
            lotesIniciais={evento.lote ?? []}
          />
        )}

        {/* Lotes (readonly — sempre visível) */}
        {!editavel && (
          <Secao titulo="Lotes">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(evento.lote ?? []).map((lote) => (
                <div key={lote.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${T.line}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{lote.nome}</p>
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{lote.preco_cents === 0 ? "Gratuito" : BRL(lote.preco_cents / 100)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{lote.quantidade_vendida} / {lote.quantidade_total}</p>
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>vendidos</p>
                  </div>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {/* Inscritos */}
        <Secao titulo={`Inscritos (${(ingressos ?? []).length})`}>
          {(ingressos ?? []).length === 0 ? (
            <p style={{ fontSize: 15, color: T.muted }}>Nenhum inscrito ainda.</p>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                    <th style={{ textAlign: "left", padding: "12px 20px", color: T.muted, fontWeight: 600, fontSize: 12 }}>PARTICIPANTE</th>
                    <th style={{ textAlign: "left", padding: "12px 20px", color: T.muted, fontWeight: 600, fontSize: 12 }}>LOTE</th>
                    <th style={{ textAlign: "left", padding: "12px 20px", color: T.muted, fontWeight: 600, fontSize: 12 }}>STATUS</th>
                    <th style={{ textAlign: "left", padding: "12px 20px", color: T.muted, fontWeight: 600, fontSize: 12 }}>DATA</th>
                  </tr>
                </thead>
                <tbody>
                  {ingressos.map((ing, i) => (
                    <tr key={ing.id} style={{ borderBottom: i < ingressos.length - 1 ? `1px solid ${T.line}` : "none" }}>
                      <td style={{ padding: "12px 20px", color: T.ink, fontWeight: 500 }}>{ing.comprador?.nome ?? "—"}</td>
                      <td style={{ padding: "12px 20px", color: T.ink2 }}>{ing.lote?.nome ?? "—"}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ing.status === "valido" ? T.mint : T.muted, background: `${ing.status === "valido" ? T.mint : T.muted}18`, padding: "3px 8px", borderRadius: 99 }}>
                          {ing.status === "valido" ? "Válido" : ing.status === "usado" ? "Usado" : "Cancelado"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", color: T.muted, fontSize: 13 }}>
                        {new Date(ing.criado_em).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.line}`, padding: "18px 20px" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: T.muted, margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 28, fontWeight: 600, color: T.ink, margin: 0 }}>{value}</p>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>{titulo}</h2>
      {children}
    </div>
  );
}
