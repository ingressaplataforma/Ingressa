import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitirToken } from "@/lib/ingresso-token";

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += parseInt(d[i]) * (10 - i);
  let r1 = s1 % 11;
  if (r1 < 2) r1 = 0; else r1 = 11 - r1;
  if (r1 !== parseInt(d[9])) return false;
  let s2 = 0;
  for (let i = 0; i < 10; i++) s2 += parseInt(d[i]) * (11 - i);
  let r2 = s2 % 11;
  if (r2 < 2) r2 = 0; else r2 = 11 - r2;
  return r2 === parseInt(d[10]);
}

export async function POST(request) {
  const { lote_id, donos } = await request.json();

  if (!lote_id) return NextResponse.json({ erro: "lote_id obrigatório" }, { status: 400 });
  if (!Array.isArray(donos) || donos.length === 0) {
    return NextResponse.json({ erro: "donos obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: comprador } = await supabase
    .from("comprador")
    .select("id, nome, cpf")
    .eq("id", user.id)
    .maybeSingle();

  if (!comprador) return NextResponse.json({ erro: "Perfil de comprador não encontrado" }, { status: 403 });

  // Comprador sem CPF não pode se inscrever — trava de servidor para fechar o furo do índice único
  if (!comprador.cpf) {
    return NextResponse.json({
      erro: "Complete seu cadastro com CPF antes de se inscrever.",
    }, { status: 403 });
  }

  const { data: lote } = await supabase
    .from("lote")
    .select("id, nome, evento_id, evento:evento_id(id, titulo, status)")
    .eq("id", lote_id)
    .maybeSingle();

  if (!lote) return NextResponse.json({ erro: "Lote não encontrado" }, { status: 404 });
  if (lote.evento.status !== "publicado") {
    return NextResponse.json({ erro: "Evento não disponível" }, { status: 400 });
  }

  // ── Validação dos donos ──────────────────────────────────────────────
  // Extras (2º em diante): nome + cpf + email obrigatórios
  for (let i = 1; i < donos.length; i++) {
    const d = donos[i];
    if (!d.nome?.trim()) return NextResponse.json({ erro: `Ingresso ${i + 1}: nome obrigatório` }, { status: 422 });
    if (!d.email?.trim()) return NextResponse.json({ erro: `Ingresso ${i + 1}: e-mail obrigatório` }, { status: 422 });
    if (!d.cpf) return NextResponse.json({ erro: `Ingresso ${i + 1}: CPF obrigatório` }, { status: 422 });
    if (!validarCPF(d.cpf)) return NextResponse.json({ erro: `Ingresso ${i + 1}: CPF inválido` }, { status: 422 });
  }

  // Normaliza CPFs (só dígitos)
  const cpfNorm = (v) => (v ? v.replace(/\D/g, "") : null);

  // Para o 1º ingresso, o CPF do comprador vem SEMPRE do banco (fonte autoritativa).
  // O cliente pode enviar vazio ou null — o que importa é o comprador.cpf da DB.
  const cpfComprador = cpfNorm(comprador.cpf) || null;

  const donosNorm = donos.map((d, i) => {
    if (i === 0) {
      return {
        nome: (d.nome || comprador.nome).trim(),
        cpf: cpfComprador,
        email: (d.email || user.email).trim().toLowerCase(),
        telefone: d.telefone?.replace(/\D/g, "") || null,
      };
    }
    return {
      nome: d.nome.trim(),
      cpf: cpfNorm(d.cpf) || null,
      email: d.email.trim().toLowerCase(),
      telefone: d.telefone?.replace(/\D/g, "") || null,
    };
  });

  // Sem CPF duplicado dentro do próprio pedido
  const cpfsNoPedido = donosNorm.map((d) => d.cpf).filter(Boolean);
  const cpfsUnicos = new Set(cpfsNoPedido);
  if (cpfsUnicos.size < cpfsNoPedido.length) {
    return NextResponse.json({ erro: "Dois ingressos com o mesmo CPF no mesmo pedido." }, { status: 422 });
  }

  // Extra com CPF do próprio comprador — bloqueado (o 1º ingresso já é dele)
  for (let i = 1; i < donosNorm.length; i++) {
    if (donosNorm[i].cpf && cpfComprador && donosNorm[i].cpf === cpfComprador) {
      return NextResponse.json({
        erro: `Ingresso ${i + 1}: você já tem o 1º ingresso para si. Os demais são para outras pessoas.`,
      }, { status: 422 });
    }
  }

  // CPFs já inscritos neste evento
  const cpfsComCpf = donosNorm.filter((d) => d.cpf).map((d) => d.cpf);
  if (cpfsComCpf.length > 0) {
    const { data: conflitos } = await supabase
      .from("ingresso")
      .select("dono_cpf")
      .eq("evento_id", lote.evento_id)
      .in("dono_cpf", cpfsComCpf);

    if (conflitos?.length > 0) {
      const cpfsConflito = conflitos.map((c) => c.dono_cpf);
      const compradorJaInscrito = cpfComprador && cpfsConflito.includes(cpfComprador);
      return NextResponse.json({
        erro: compradorJaInscrito
          ? "Você já tem ingresso para este evento."
          : `CPF já inscrito neste evento: ${cpfsConflito.join(", ")}`,
      }, { status: 409 });
    }
  }

  // ── Gera código + token para cada dono ──────────────────────────────
  const donosComToken = donosNorm.map((d) => {
    const codigo = crypto.randomUUID();
    const token = emitirToken({
      eventoId: lote.evento_id,
      codigo,
      loteNome: lote.nome,
      nomeParticipante: d.nome,
    });
    return { ...d, codigo, token_assinado: token };
  });

  // ── Inscrição atômica via RPC batch ─────────────────────────────────
  const { data: ingressoIds, error: rpcError } = await supabase.rpc("inscrever_lote_batch", {
    p_lote_id: lote_id,
    p_comprador_id: comprador.id,
    p_donos: donosComToken.map((d) => ({
      codigo: d.codigo,
      token_assinado: d.token_assinado,
      dono_nome: d.nome,
      dono_cpf: d.cpf,
      dono_email: d.email,
      dono_telefone: d.telefone,
    })),
  });

  if (rpcError) {
    if (rpcError.message?.includes("lote_esgotado")) {
      return NextResponse.json({ erro: "Lote esgotado" }, { status: 409 });
    }
    if (rpcError.message?.includes("cpf_duplicado_no_lote")) {
      return NextResponse.json({ erro: "Dois ingressos com o mesmo CPF no mesmo pedido." }, { status: 422 });
    }
    if (rpcError.message?.includes("cpf_ja_inscrito") || rpcError.message?.includes("ingresso_evento_dono_cpf_unico")) {
      return NextResponse.json({ erro: "CPF já inscrito neste evento." }, { status: 409 });
    }
    console.error("RPC inscrever_lote_batch:", rpcError);
    return NextResponse.json({ erro: "Erro ao registrar inscrição" }, { status: 500 });
  }

  // ── Leads: extras (2º em diante) ────────────────────────────────────
  const extras = donosNorm.slice(1);
  if (extras.length > 0) {
    await supabase.from("lead").insert(
      extras.map((d) => ({
        nome: d.nome,
        cpf: d.cpf,
        email: d.email,
        telefone: d.telefone,
        origem_evento_id: lote.evento_id,
        origem_comprador_id: comprador.id,
      }))
    );
    // Lead insert é melhor-esforço — não falha a inscrição se der erro
  }

  return NextResponse.json({
    ingressos: donosComToken.map((d, i) => ({
      ingresso_id: ingressoIds?.[i] ?? null,
      codigo: d.codigo,
      token: d.token_assinado,
      dono_nome: d.nome,
    })),
  });
}
