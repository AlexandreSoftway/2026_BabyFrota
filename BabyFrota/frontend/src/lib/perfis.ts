/**
 * Espelha os valores de referência da tabela Perfil / enum EPerfil do sistema legado (PerfilSistema na API).
 * A regra de verdade é sempre validada no servidor; aqui só evita mostrar uma ação ou tela que o servidor vai recusar.
 */
export const PERFIL_ADMINISTRADOR = 1
export const PERFIL_GERENTE = 2
export const PERFIL_OPERADOR = 3

/** Perfis que o legado trata como supervisão: cadastros de Carrinho/Tipo de Carrinho, relatórios e Etiquetas. */
export const PERFIS_SUPERVISAO = [PERFIL_ADMINISTRADOR, PERFIL_GERENTE]
