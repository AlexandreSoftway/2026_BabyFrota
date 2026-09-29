/** Formatos de leitura dos dados de cadastro, que o banco guarda só com dígitos. Vazio vira null (a tela mostra "—"). */

const digitos = (valor: string | null | undefined) => (valor ?? '').replace(/\D/g, '')

/** "01561797170" -> "015.617.971-70". */
export function formatarCpf(cpf: string | null | undefined): string | null {
  const d = digitos(cpf)
  if (!d) return null
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf ?? '').trim()
}

/** ("61", "996621144") -> "(61) 99662-1144"; fixo de 8 dígitos -> "(61) 3356-6035". */
export function formatarTelefone(ddd: string | null | undefined, numero: string | null | undefined): string | null {
  const d = digitos(numero)
  if (!d) return null
  const separado =
    d.length === 9 ? `${d.slice(0, 5)}-${d.slice(5)}` : d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
  const prefixo = digitos(ddd)
  return prefixo ? `(${prefixo}) ${separado}` : separado
}

/** "71967000" -> "71967-000". */
export function formatarCep(cep: string | null | undefined): string | null {
  const d = digitos(cep)
  if (!d) return null
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (cep ?? '').trim()
}

/** "1989-09-01" ou "1989-09-01T00:00:00" -> "01/09/1989", lido do texto (sem fuso, a data não "anda" um dia). */
export function formatarDataCurta(iso: string | null | undefined): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null
}

/** "M"/"F" -> "Masculino"/"Feminino". */
export function descreverSexo(sexo: string | null | undefined): string | null {
  const s = (sexo ?? '').trim().toUpperCase()
  return s === 'M' ? 'Masculino' : s === 'F' ? 'Feminino' : null
}
