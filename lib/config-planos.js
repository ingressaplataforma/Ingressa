/**
 * Configurações de negócio dos planos — ponto único de ajuste.
 * SERVER-ONLY: não importar em componentes cliente.
 *
 * Preço: gerenciado pela tabela `plano` no Supabase (não cravar aqui).
 * Este arquivo controla apenas parâmetros operacionais.
 */

// Dias de tolerância após falha de pagamento antes de bloquear o acesso.
// Alterar aqui afeta toda a lógica de graça automaticamente.
export const DIAS_GRACA = 7;

// Nome exibido na cobrança no Asaas (aparece no extrato do organizador).
export const DESCRICAO_PLANO_ASAAS = "Plano Ingressa — acesso mensal";
