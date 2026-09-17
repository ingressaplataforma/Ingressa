"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { CATEGORIAS, UFS } from "@/lib/categorias";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

const selectStyle = {
  height: 40,
  borderRadius: 9,
  border: `1px solid ${T.line}`,
  padding: "0 12px",
  fontSize: 14,
  fontFamily: fontBody,
  color: T.ink,
  background: "#fff",
  outline: "none",
  cursor: "pointer",
};

export default function FiltersClient({ q, cat, uf, periodo }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef(null);

  // TODO (geolocalização futura): ao montar, chamar navigator.geolocation.getCurrentPosition()
  // para detectar a UF do comprador e pré-selecionar o filtro de estado automaticamente.
  // Por enquanto o comprador seleciona manualmente.

  const update = useCallback(
    (key, value) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  function handleQ(e) {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update("q", val.trim()), 450);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 32,
        padding: "16px 20px",
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
        style={{
          ...selectStyle,
          flex: "1 1 200px",
          minWidth: 160,
          padding: "0 12px",
        }}
      />

      {/* Categoria */}
      <select
        value={cat}
        onChange={(e) => update("cat", e.target.value)}
        style={{ ...selectStyle, flex: "0 0 auto", minWidth: 180 }}
      >
        <option value="">Todas as categorias</option>
        {CATEGORIAS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {/* Estado (UF) */}
      <select
        value={uf}
        onChange={(e) => update("uf", e.target.value)}
        style={{ ...selectStyle, flex: "0 0 auto", minWidth: 180 }}
      >
        <option value="">Todos os estados</option>
        {UFS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Período */}
      <select
        value={periodo}
        onChange={(e) => update("periodo", e.target.value)}
        style={{ ...selectStyle, flex: "0 0 auto", minWidth: 160 }}
      >
        <option value="">Qualquer data</option>
        <option value="7d">Próximos 7 dias</option>
        <option value="mes">Este mês</option>
        <option value="prox_mes">Próximo mês</option>
      </select>

      {/* Limpar filtros — aparece quando há algum filtro ativo */}
      {(q || cat || uf || periodo) && (
        <button
          onClick={() => router.push(pathname)}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 9,
            border: `1px solid ${T.line}`,
            background: "transparent",
            color: T.muted,
            fontSize: 13,
            fontFamily: fontBody,
            cursor: "pointer",
          }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
