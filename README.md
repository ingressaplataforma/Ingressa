# Ingressa — Landing

Landing pública em Next.js (App Router). Migrada do protótipo React com `next/font` e CSS estático.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:3000
```

## Estrutura

```
app/
  layout.js              # fontes (next/font), metadata
  page.js                # rota raiz (server component)
  globals.css            # reset, slider, responsivo
  components/
    Landing.jsx          # a landing (client component — tem interatividade)
lib/
  tokens.js              # design tokens (T) e BRL, compartilhados
```

## Colocar no ar (Vercel via GitHub)

1. **GitHub**: crie um repositório e suba este projeto.
   ```bash
   git init && git add . && git commit -m "landing inicial"
   git branch -M main
   git remote add origin git@github.com:SEU_USUARIO/ingressa.git
   git push -u origin main
   ```
2. **Vercel**: em vercel.com → Add New → Project → Import do repositório.
   A Vercel detecta Next.js sozinha. Clique em Deploy.
   Você recebe uma URL pública `ingressa-xxxx.vercel.app` (sem domínio próprio, já funciona).
3. Cada `git push` na `main` vira um deploy automático.

## Supabase (prepare agora, ligue depois)

A landing ainda não consome o banco. Mas já crie o projeto no Supabase e
configure as variáveis na Vercel (Project Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Localmente, copie `.env.local.example` para `.env.local` e preencha.
Nunca comite `.env.local` (já está no `.gitignore`).

## Nota sobre as fontes

`next/font` baixa Fraunces e Inter do Google Fonts no momento do build — isso
acontece nos servidores da Vercel, que têm acesso à internet. Em ambientes sem
acesso ao `fonts.googleapis.com` o build falha nessa etapa; não é erro do código.
