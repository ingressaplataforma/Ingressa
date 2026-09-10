import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolverPapel, rotaParaPapel } from "@/lib/supabase/papeis";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=sem-codigo`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
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

  // Após confirmar e-mail, cria/atualiza a linha do organizador com os metadados do signup
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { nome, documento, telefone } = user.user_metadata ?? {};
    await supabase.from("organizador").upsert({
      id: user.id,
      nome: nome ?? "",
      documento: documento ?? "",
      telefone: telefone ?? null,
    });
  }

  const papel = user ? await resolverPapel(supabase, user.id) : null;
  return NextResponse.redirect(`${origin}${rotaParaPapel(papel)}`);
}
