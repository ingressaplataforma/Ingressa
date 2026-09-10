import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolverPapel, rotaParaPapel } from "@/lib/supabase/papeis";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" permite redirecionar de volta ao fluxo de inscrição após confirmação de e-mail
  const next = searchParams.get("next");
  // "role" identifica o fluxo de comprador (vindo da página de inscrição)
  const roleHint = searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=sem-codigo`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=confirmacao`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const meta = user.user_metadata ?? {};
    const isCompradorFlow = roleHint === "comprador" || meta.role === "comprador";

    if (isCompradorFlow) {
      // Fluxo de comprador: garantir que o perfil existe (Google ou e-mail)
      const { data: existing } = await supabase
        .from("comprador").select("id").eq("id", user.id).maybeSingle();
      if (!existing) {
        const nome = meta.nome || meta.full_name || meta.name || user.email.split("@")[0];
        await supabase.from("comprador").upsert({ id: user.id, nome });
      }
    } else if (meta.nome && meta.documento) {
      // Fluxo de organizador (cadastro manual com nome + documento)
      await supabase.from("organizador").upsert({
        id: user.id,
        nome: meta.nome,
        documento: meta.documento,
        telefone: meta.telefone ?? null,
      });
    }
    // Google sem role hint e sem documento → /completar-cadastro (organizador)
  }

  // Redirecionar: respeitar "next" se for caminho interno seguro
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const papel = user ? await resolverPapel(supabase, user.id) : null;
  const destino = safeNext || rotaParaPapel(papel);
  return NextResponse.redirect(`${origin}${destino}`);
}
