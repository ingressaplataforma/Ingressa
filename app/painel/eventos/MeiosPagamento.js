import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

function MeioRow({ label, desc, checked, disabled, nota, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 10,
        cursor: disabled ? "default" : "pointer",
        border: `1.5px solid ${checked ? (disabled ? T.mint : T.ink) : T.line}`,
        background: checked ? (disabled ? `${T.mint}18` : "#F6F4FF") : "#fff",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={disabled ? undefined : (e) => onChange(e.target.checked)}
        style={{
          marginTop: 2,
          width: 16,
          height: 16,
          flexShrink: 0,
          accentColor: disabled ? T.mint : T.ink,
          cursor: disabled ? "default" : "pointer",
        }}
      />
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: T.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontFamily: fontBody,
          }}
        >
          {label}
          {nota && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.mintDk,
                background: `${T.mint}20`,
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              {nota}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 3, fontFamily: fontBody }}>
          {desc}
        </div>
      </div>
    </label>
  );
}

/**
 * Seção "Formas de pagamento aceitas" — usar apenas em eventos com lote pago.
 * Pix está sempre travado como aceito. Cartão e boleto são opcionais.
 *
 * @param {{ aceita_cartao: boolean, aceita_boleto: boolean,
 *           onChange: (key: string, val: boolean) => void }} props
 */
export default function MeiosPagamento({ aceita_cartao, aceita_boleto, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <MeioRow
        label="Pix"
        desc="Grátis e rápido (repasse no próximo dia útil)."
        checked={true}
        disabled={true}
        nota="sempre aceito"
      />
      <MeioRow
        label="Cartão de crédito"
        desc="Custo da operadora repassado; recebimento em ~32 dias."
        checked={aceita_cartao}
        onChange={(val) => onChange("aceita_cartao", val)}
      />
      <MeioRow
        label="Boleto bancário"
        desc="Custo fixo por boleto; participante pode não pagar."
        checked={aceita_boleto}
        onChange={(val) => onChange("aceita_boleto", val)}
      />
    </div>
  );
}
