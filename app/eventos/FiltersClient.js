"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CATEGORIAS, UFS } from "@/lib/categorias";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

// Base sem width:100% — cada campo define sua própria largura/flex
const fieldBase = {
  height: 38,
  borderRadius: 8,
  border: `1.5px solid ${T.line}`,
  padding: "0 11px",
  fontSize: 13,
  fontFamily: fontBody,
  color: T.ink,
  background: "#fff",
  outline: "none",
  minWidth: 0,
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
          display: "none", // CSS override para mobile via className
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 14px",
          borderRadius: 8,
          border: `1.5px solid ${filtersOpen ? T.ink : T.line}`,
          background: filtersOpen ? T.ink : "#fff",
          color: filtersOpen ? "#fff" : T.ink,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: fontBody,
          cursor: "pointer",
          marginBottom: 8,
          transition: "background 0.15s, color 0.15s, border-color 0.15s",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        Filtros
        {filtrosAtivos > 0 && (
          <span style={{ background: T.coral, color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>
            {filtrosAtivos}
          </span>
        )}
      </button>

      {/* Barra de filtros compacta — desktop: linha única; mobile: grid 2×2 */}
      <div
        className={`vitrine-filters-panel${filtersOpen ? " open" : ""}`}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Busca por texto — mais larga, cresce com o espaço disponível */}
        <input
          type="search"
          defaultValue={q}
          placeholder="Buscar por nome ou local…"
          onChange={handleQ}
          style={{ ...fieldBase, flex: "2 1 180px" }}
        />

        {/* Categoria */}
        <select
          value={cat}
          onChange={(e) => update("cat", e.target.value)}
          style={{ ...fieldBase, flex: "1 1 140px", cursor: "pointer" }}
        >
          <option value="">Categoria</option>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={uf}
          onChange={(e) => update("uf", e.target.value)}
          style={{ ...fieldBase, flex: "1 1 120px", cursor: "pointer" }}
        >
          <option value="">Estado</option>
          {UFS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Período */}
        <select
          value={periodo}
          onChange={(e) => update("periodo", e.target.value)}
          style={{ ...fieldBase, flex: "1 1 130px", cursor: "pointer" }}
        >
          <option value="">Próximos</option>
          <option value="7d">Próx. 7 dias</option>
          <option value="mes">Este mês</option>
          <option value="prox_mes">Próx. mês</option>
          <option value="passados">Incluir passados</option>
        </select>

        {/* Limpar filtros */}
        {temFiltro && (
          <button
            onClick={() => router.push(pathname)}
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: `1.5px solid ${T.line}`,
              background: "transparent",
              color: T.muted,
              fontSize: 12,
              fontFamily: fontBody,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
