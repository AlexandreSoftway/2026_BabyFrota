/**
 * Reduz a imagem no navegador antes de enviar: o lado maior fica com até `ladoMaximo` pixels, em JPEG. Assim uma foto de
 * celular (3 a 5 MB) vira algumas dezenas de KB, o envio é rápido e o banco não incha. O legado também reduzia a foto
 * (para 250 px), só que no servidor.
 */
export async function reduzirImagem(arquivo: Blob, ladoMaximo: number, qualidade = 0.85): Promise<Blob> {
  const { fonte, largura: larguraOriginal, altura: alturaOriginal, liberar } = await carregar(arquivo)
  try {
    const escala = Math.min(1, ladoMaximo / Math.max(larguraOriginal, alturaOriginal))
    const largura = Math.max(1, Math.round(larguraOriginal * escala))
    const altura = Math.max(1, Math.round(alturaOriginal * escala))

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('Este navegador não consegue processar a imagem.')

    // JPEG não tem transparência: o fundo de um PNG transparente sai branco, e não preto.
    contexto.fillStyle = '#ffffff'
    contexto.fillRect(0, 0, largura, altura)
    contexto.imageSmoothingQuality = 'high'
    contexto.drawImage(fonte, 0, 0, largura, altura)

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível converter a imagem.'))),
        'image/jpeg',
        qualidade,
      ),
    )
  } finally {
    liberar()
  }
}

/**
 * A câmera só existe em página segura (https ou localhost). Fora disso o navegador nem oferece a função, e o botão some;
 * no celular o "Enviar" já abre a câmera.
 */
export const cameraDisponivel = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'

interface ImagemCarregada {
  fonte: CanvasImageSource
  largura: number
  altura: number
  liberar: () => void
}

async function carregar(arquivo: Blob): Promise<ImagemCarregada> {
  // createImageBitmap já aplica a orientação gravada pela câmera do celular (senão a foto sai deitada).
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
      return { fonte: bitmap, largura: bitmap.width, altura: bitmap.height, liberar: () => bitmap.close() }
    } catch {
      // Cai para o <img>, que alguns navegadores decodificam em formatos que o createImageBitmap recusa.
    }
  }

  const url = URL.createObjectURL(arquivo)
  const imagem = new Image()
  imagem.src = url
  try {
    await imagem.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('Formato de imagem não suportado. Use JPG ou PNG.')
  }
  return { fonte: imagem, largura: imagem.naturalWidth, altura: imagem.naturalHeight, liberar: () => URL.revokeObjectURL(url) }
}
