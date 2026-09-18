"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CATEGORIAS, UFS } from "@/lib/categorias";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const fieldStyle = {
  height: 42,
  borderRadius: 10,
  border: `1.5px solid ${T.line}`,
  padding: "0 13px",
  fontSize: 14,
  fontFamily: fontBody,
  color: T.ink,
  background: "#fff",
  outline: "none",
  width: "100%",
};

export default function FiltersClient({ q, cat, uf, periodo }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // TODO (geolocalização futura): ao montar, chamar navigator.geolocation.getCurrentPosition()
  // para detectar a UF do comprador e pré-selecionar automaticamente o filtro de estado.

  const update = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  function handleQ(e) {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update("q", val.trim()), 450);
  }

  const temFiltro = !!(q || cat || uf || periodo);
  const filtrosAtivos = [q, cat, uf, periodo].filter(Boolean).length;

  return (
    <div>
      {/* Toggle: visível só no mobile (CSS controla display) */}
      <button
        className="vitrine-filter-toggle"
        onClick={() => setFiltersOpen((o) => !o)}
        style={{
          alignItems: "center",
          gap: 8,
          height: 42,
          padding: "0 16px",
          borderRadius: 10,
          border: `1.5px solid ${filtersOpen ? T.ink : T.line}`,
          background: filtersOpen ? T.ink : "#fff",
          color: filtersOpen ? "#fff" : T.ink,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: fontBody,
          cursor: "pointer",
          marginBottom: 10,
          transition: "background 0.15s, color 0.15s, border-color 0.15s",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        Filtros
        {filtrosAtivos > 0 && (
          <span style={{ background: T.coral, color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>
            {filtrosAtivos}
          </span>
        )}
      </button>

      {/* Painel de filtros — no desktop sempre visível, no mobile togglável */}
      <div
        className={`vitrine-filters-panel${filtersOpen ? " open" : ""}`}
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "14px 18px",
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${T.line}`,
        }}
      >
        {/* Busca por texto */}
        <input
          type="search"
          defaultValue={q}
          placeholder="Buscar por nome ou local…"
          onChange={handleQ}
          style={{ ...fieldStyle, flex: "1 1 200px", minWidth: 160 }}
        />

        {/* Categoria */}
        <select
          value={cat}
          onChange={(e) => update("cat", e.target.value)}
          style={{ ...fieldStyle, flex: "0 0 auto", minWidth: 190, cursor: "pointer" }}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={uf}
          onChange={(e) => update("uf", e.target.value)}
          style={{ ...fieldStyle, flex: "0 0 auto", minWidth: 190, cursor: "pointer" }}
        >
          <option value="">Todos os estados</option>
          {UFS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Período */}
        <select
          value={periodo}
          onChange={(e) => update("periodo", e.target.value)}
          style={{ ...fieldStyle, flex: "0 0 auto", minWidth: 160, cursor: "pointer" }}
        >
          <option value="">Qualquer data</option>
          <option value="7d">Próximos 7 dias</option>
          <option value="mes">Este mês</option>
          <option value="prox_mes">Próximo mês</option>
        </select>

        {/* Limpar filtros */}
        {temFiltro && (
          <button
            onClick={() => router.push(pathname)}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 10,
              border: `1.5px solid ${T.line}`,
              background: "transparent",
              color: T.muted,
              fontSize: 13,
              fontFamily: fontBody,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
