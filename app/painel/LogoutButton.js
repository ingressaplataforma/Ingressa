"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { T } from "../../lib/tokens";

const fontBody = "var(--font-body), -apple-system, system-ui, sans-serif";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{ background: "transparent", color: T.muted, border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: fontBody }}
    >
      Sair
    </button>
  );
}
