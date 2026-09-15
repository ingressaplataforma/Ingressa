import { redirect } from "next/navigation";

// /cadastro → mantém compatibilidade com links existentes
export default function CadastroPage() {
  redirect("/cadastro/organizador");
}
