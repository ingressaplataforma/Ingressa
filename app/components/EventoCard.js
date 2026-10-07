import Link from "next/link";
import { T, BRL } from "@/lib/tokens";
import { CATEGORIA_LABEL } from "@/lib/categorias";

const fontDisplay = "var(--font-display), Georgia, serif";

const GRADIENTES = [
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 100%)",
  "linear-gradient(145deg, #231647 0%, #1A1035 55%, #00C89618 100%)",
  "linear-gradient(145deg, #2A1A5E 0%, #3B1F3F 100%)",
  "linear-gradient(145deg, #1A1035 0%, #3B2E63 70%, #FF5A5F14 100%)",
];

function gradiente(id) {
  return GRADIENTES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTES.length];
}

function fmtData(iso) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

function precoInfo(lotes) {
  const precos = lotes?.map((l) => l.preco_cents) ?? [];
  if (!precos.length) return null;
  if (precos.every((p) => p === 0)) return { texto: "Gratuito", cor: T.mint };
  return { texto: `a partir de ${BRL(Math.min(...precos) / 100)}`, cor: T.ink };
}

export default function EventoCard({ ev }) {
  const preco = precoInfo(ev.lote);
  return (
    <Link href={`/e/${ev.slug}`} style={{ textDecoration: "none" }}>
      <article className="vitrine-card" style={{
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${T.line}`,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden", background: gradiente(ev.id), flexShrink: 0 }}>
          {ev.imagem_url ? (
            <img
              src={ev.imagem_url}
              alt={ev.titulo}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "14px 16px" }}>
              <span style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", lineHeight: 1.3 }}>
                {ev.titulo}
              </span>
            </div>
          )}
          {ev.categoria && ev.categoria !== "outro" && (
            <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(26,16,53,0.65)", padding: "3px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em", backdropFilter: "blur(4px)" }}>
              {CATEGORIA_LABEL[ev.categoria] ?? ev.categoria}
            </span>
          )}
        </div>

        <div style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.coral, margin: 0 }}>
            {fmtData(ev.data_inicio)}{ev.uf ? ` · ${ev.uf}` : ""}
          </p>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            {ev.titulo}
          </h3>
          {ev.local_nome && (
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>📍 {ev.local_nome}</p>
          )}
          {preco && (
            <p style={{ fontSize: 14, fontWeight: 700, color: preco.cor, margin: "auto 0 0" }}>
              {preco.texto}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
