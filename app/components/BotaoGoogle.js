"use client";

import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function BotaoGoogle({ label = "Continuar com Google" }) {
  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 20px" }}>
        <div style={{ flex: 1, height: 1, background: T.line }} />
        <span style={{ fontSize: 13, color: T.muted, whiteSpace: "nowrap" }}>ou</span>
        <div style={{ flex: 1, height: 1, background: T.line }} />
      </div>

      <button
        type="button"
        onClick={handleClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "12px 16px",
          background: "#fff",
          color: T.ink,
          border: `1.5px solid ${T.line}`,
          borderRadius: 11,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: fontBody,
          marginBottom: 4,
        }}
      >
        <GoogleIcon />
        {label}
      </button>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.25 22.56 15.43 22.56 12.25z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
