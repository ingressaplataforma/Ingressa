import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session — do not remove this call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas que exigem sessão ativa
  const rotasProtegidas = ["/painel", "/completar-cadastro", "/meus-ingressos"];
  if (!user && rotasProtegidas.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  // Redirect already-logged-in users away from /entrar and /cadastro.
  if (user && (pathname === "/entrar" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  // Guard de CPF: perfis sem CPF/documento são bloqueados em rotas protegidas.
  // Não aplica em /completar-cadastro (evita loop infinito).
  const rotasComCpfGuard = ["/painel", "/meus-ingressos"];
  if (user && rotasComCpfGuard.some((r) => pathname.startsWith(r))) {
    const [{ data: org }, { data: cmp }] = await Promise.all([
      supabase.from("organizador").select("documento").eq("id", user.id).maybeSingle(),
      supabase.from("comprador").select("cpf").eq("id", user.id).maybeSingle(),
    ]);

    const orgSemDoc = org && !org.documento;
    const cmpSemCpf = cmp && !cmp.cpf;

    if (orgSemDoc || cmpSemCpf) {
      const url = request.nextUrl.clone();
      url.pathname = "/completar-cadastro";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
