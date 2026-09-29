export interface Usuario {
  id: number
  nome: string
  email: string
  cpf: string | null
  rg: string | null
  ddd: string | null
  telefone: string | null
  dddCelular: string | null
  celular: string | null
  perfilId: number
  perfilNome: string
  ativo: boolean
  dataCadastro: string | null
}

export interface UsuarioUpsert {
  nome: string
  email: string
  cpf?: string
  rg?: string
  ddd?: string
  telefone?: string
  dddCelular?: string
  celular?: string
  perfilId: number
  ativo: boolean
  /** Obrigatório na criação; deixe vazio na edição para manter a senha atual. */
  senha?: string
}

export interface Perfil {
  id: number
  nome: string
}
