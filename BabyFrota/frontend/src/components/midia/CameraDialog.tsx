import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function mensagemDeErro(erro: unknown) {
  const nome = erro instanceof DOMException ? erro.name : ''
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'O navegador não liberou a câmera. Permita o acesso e tente de novo.'
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Nenhuma câmera encontrada neste aparelho.'
  if (nome === 'NotReadableError') return 'A câmera está em uso por outro programa.'
  return 'Não foi possível abrir a câmera.'
}

/** Tira uma foto pela câmera do aparelho (a webcam do balcão, como a captura do legado). */
export function CameraDialog({
  aberto,
  titulo,
  onFechar,
  onCapturar,
}: {
  aberto: boolean
  titulo: string
  onFechar: () => void
  onCapturar: (foto: Blob) => void
}) {
  const [fluxo, setFluxo] = useState<MediaStream | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pronta, setPronta] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!aberto) return
    let cancelado = false
    let aberta: MediaStream | null = null
    setErro(null)
    setPronta(false)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        aberta = stream
        setFluxo(stream)
      })
      .catch((e: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(e))
      })
    return () => {
      cancelado = true
      aberta?.getTracks().forEach((t) => t.stop())
      setFluxo(null)
    }
  }, [aberto])

  // O <video> monta junto com o modal; liga a câmera nele assim que os dois existem.
  const ligarVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video
      if (video && fluxo && video.srcObject !== fluxo) video.srcObject = fluxo
    },
    [fluxo],
  )

  function capturar() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (foto) => {
        if (!foto) return
        onCapturar(foto)
        onFechar()
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Enquadre e clique em Capturar.</DialogDescription>
        </DialogHeader>

        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
          {erro ? (
            <p role="alert" className="px-6 text-center text-sm text-white">
              {erro}
            </p>
          ) : (
            <>
              <video
                ref={ligarVideo}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setPronta(true)}
                className="h-full w-full object-contain"
              />
              {!pronta && <Loader2 className="absolute size-6 animate-spin text-white" />}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" onClick={capturar} disabled={!pronta || erro !== null}>
            <Camera /> Capturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
