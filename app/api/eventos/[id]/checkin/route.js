import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validarToken } from "@/lib/ingresso-token";

const MOTIVOS = {
  malformado: "QR inválido ou corrompido",
  assinatura_invalida: "QR adulterado — assinatura não confere",
  evento_errado: "QR pertence a outro evento",
  fora_da_janela: "QR expirado ou ainda não válido",
  nao_encontrado: "Ingresso não encontrado neste evento",
};

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  let codigo;

  // Modo QR: valida assinatura antes de aceitar
  if (body.token) {
    const result = validarToken(body.token, id);
    if (!result.valido) {
      return NextResponse.json({
        resultado: "invalido",
        motivo: MOTIVOS[result.motivo] ?? result.motivo,
      });
    }
    codigo = result.payload.codigo;
  } else if (body.codigo) {
    // Modo manual: organizador escolheu o participante — sem validação de token
    codigo = body.codigo;
  } else {
    return NextResponse.json({ erro: "token ou codigo obrigatório" }, { status: 400 });
  }

  // RPC atômica: evita corrida entre dois check-ins simultâneos
  const { data, error } = await supabase.rpc("fazer_checkin", {
    p_codigo: codigo,
    p_evento_id: id,
    p_usado_por: user.id,
    p_origem: "online",
  });

  if (error) {
    if (error.message?.includes("acesso_negado")) {
      return NextResponse.json({ erro: "Sem permissão para este evento" }, { status: 403 });
    }
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }

  const r = data;

  // Busca email do participante para exibição no check-in
  let emailParticipante = null;
  if (r.resultado === "ok" || r.resultado === "ja_usado") {
    const { data: ingRow } = await supabase
      .from("ingresso")
      .select("comprador:comprador_id(email)")
      .eq("codigo", codigo)
      .eq("evento_id", id)
      .maybeSingle();
    emailParticipante = ingRow?.comprador?.email ?? null;
  }

  if (r.resultado === "ok") {
    return NextResponse.json({ resultado: "ok", nome: r.nome, email: emailParticipante, lote: r.lote });
  }
  if (r.resultado === "ja_usado") {
    return NextResponse.json({ resultado: "ja_usado", nome: r.nome, email: emailParticipante, lote: r.lote, usado_em: r.usado_em });
  }
  if (r.resultado === "nao_encontrado") {
    return NextResponse.json({ resultado: "invalido", motivo: MOTIVOS.nao_encontrado });
  }
  return NextResponse.json({ resultado: "invalido", motivo: `Status: ${r.status}` });
}
