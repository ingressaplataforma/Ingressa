import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { criarSubconta } from "@/lib/asaas";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: org } = await supabase
    .from("organizador")
    .select("id, gateway_recipient_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!org) return NextResponse.json({ erro: "Não é organizador" }, { status: 403 });
  if (org.gateway_recipient_id) return NextResponse.json({ ok: true, ja_configurado: true });

  const { nome, email, cpfCnpj, birthDate, companyType, incomeValue, mobilePhone, postalCode, address, addressNumber, province, city, state } = await request.json();

  const cpfCnpjDigits = (cpfCnpj ?? "").replace(/\D/g, "");
  const isPF = cpfCnpjDigits.length <= 11;

  if (!nome || !email || !cpfCnpj || !mobilePhone || !postalCode || !address || !addressNumber || !province || !incomeValue) {
    return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  if (isPF && !birthDate) {
    return NextResponse.json({ erro: "Data de nascimento é obrigatória para pessoa física." }, { status: 400 });
  }
  if (!isPF && !companyType) {
    return NextResponse.json({ erro: "Tipo de empresa é obrigatório para pessoa jurídica." }, { status: 400 });
  }

  let subconta;
  try {
    const payload = {
      name:          nome.trim(),
      email:         email.trim().toLowerCase(),
      cpfCnpj:       cpfCnpjDigits,
      mobilePhone:   mobilePhone.replace(/\D/g, ""),
      postalCode:    postalCode.replace(/\D/g, ""),
      address:       address.trim(),
      addressNumber: addressNumber.trim(),
      province:      province.trim(),
      incomeValue:   parseFloat(String(incomeValue).replace(",", ".")),
    };
    if (city?.trim()) payload.city = city.trim();
    if (state?.trim()) payload.state = state.trim();
    if (isPF) {
      payload.birthDate = birthDate;
    } else {
      payload.companyType = companyType;
    }
    subconta = await criarSubconta(payload);
  } catch (err) {
    console.error("Asaas criarSubconta:", err.message);
    return NextResponse.json(
      { erro: `Erro ao registrar recebedor no Asaas: ${err.message}` },
      { status: 502 }
    );
  }

  // Asaas retorna { id (account id), walletId, ... }
  // walletId é o que vai no split; id é o identificador da subconta.
  const walletId = subconta.walletId ?? subconta.id;

  const { error: dbErr } = await supabase
    .from("organizador")
    .update({ gateway_recipient_id: walletId })
    .eq("id", user.id);

  if (dbErr) {
    console.error("Salvar gateway_recipient_id:", dbErr.message);
    return NextResponse.json({ erro: "Recebedor criado no Asaas mas erro ao salvar localmente. Contate o suporte." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, wallet_id: walletId });
}
