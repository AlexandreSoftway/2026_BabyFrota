import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AxiosError } from 'axios'
import { Camera, FileImage, Loader2, Trash2, Upload, UserRound } from 'lucide-react'
import { CameraDialog } from '@/components/midia/CameraDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEnviarImagem, useImagem, useRemoverImagem } from '@/features/midias/api'
import { cameraDisponivel, reduzirImagem } from '@/lib/imagem'
import { cn, extrairMensagemErro } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

interface CampoImagemProps {
  /** "Foto", "Documento"... */
  titulo: string
  /** Para as mensagens: "a foto" / "o documento". */
  genero: 'a' | 'o'
  /** Rota da API, ex.: "/cliente/12/foto". */
  url: string
  /** Lado maior da imagem enviada, em pixels. */
  ladoMaximo: number
  formato?: 'retrato' | 'documento'
  somenteLeitura?: boolean
}

/**
 * Uma imagem guardada no registro, como no legado: mostra a atual, envia outra (arquivo ou câmera) e remove. Salva na
 * hora, sem esperar o "Salvar" do formulário, igual aos botões "Carregar" do legado. Clicar na imagem amplia.
 */
export function CampoImagem({ titulo, genero, url, ladoMaximo, formato = 'retrato', somenteLeitura }: CampoImagemProps) {
  const { data: imagem, isLoading, isError } = useImagem(url)
  const enviar = useEnviarImagem(url)
  const remover = useRemoverImagem(url)

  const [endereco, setEndereco] = useState<string | null>(null)
  const [ampliada, setAmpliada] = useState(false)
  const [camera, setCamera] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Endereço local da imagem baixada; liberado quando ela muda ou o campo sai da tela.
  useEffect(() => {
    if (!imagem) {
      setEndereco(null)
      return
    }
    const novo = URL.createObjectURL(imagem)
    setEndereco(novo)
    return () => URL.revokeObjectURL(novo)
  }, [imagem])

  const nome = `${genero} ${titulo.toLowerCase()}`
  const ocupado = preparando || enviar.isPending || remover.isPending

  async function salvar(arquivo: Blob) {
    setPreparando(true)
    try {
      const reduzida = await reduzirImagem(arquivo, ladoMaximo)
      setPreparando(false)
      await enviar.mutateAsync(reduzida)
      toast.success(`${titulo} ${genero === 'a' ? 'salva' : 'salvo'}.`)
    } catch (err) {
      const detalhe = err instanceof AxiosError || !(err instanceof Error) ? extrairMensagemErro(err) : err.message
      toast.error(`Não foi possível salvar ${nome}.`, detalhe)
    } finally {
      setPreparando(false)
    }
  }

  function aoEscolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    // Limpa para o mesmo arquivo poder ser escolhido de novo.
    e.target.value = ''
    if (arquivo) void salvar(arquivo)
  }

  async function aoRemover() {
    if (!confirm(`Remover ${nome}?`)) return
    try {
      await remover.mutateAsync()
      toast.success(`${titulo} ${genero === 'a' ? 'removida' : 'removido'}.`)
    } catch (err) {
      toast.error(`Não foi possível remover ${nome}.`, extrairMensagemErro(err))
    }
  }

  const Vazio = formato === 'retrato' ? UserRound : FileImage

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{titulo}</p>
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        disabled={!endereco}
        title={endereco ? 'Ampliar' : undefined}
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-lg border bg-muted/40 text-muted-foreground',
          formato === 'retrato' ? 'size-36' : 'h-36 w-48',
          endereco && 'cursor-zoom-in',
        )}
      >
        {isLoading || ocupado ? (
          <Loader2 className="size-5 animate-spin" />
        ) : endereco ? (
          <img src={endereco} alt={titulo} className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <Vazio className="size-8" />
            {isError ? 'Não foi possível carregar' : `Sem ${titulo.toLowerCase()}`}
          </span>
        )}
      </button>

      {!somenteLeitura && (
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => inputRef.current?.click()}>
            <Upload /> Enviar
          </Button>
          {cameraDisponivel() && (
            <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => setCamera(true)}>
              <Camera /> Câmera
            </Button>
          )}
          {endereco && (
            <Button type="button" size="sm" variant="ghost" disabled={ocupado} onClick={aoRemover} title={`Remover ${nome}`}>
              <Trash2 />
              <span className="sr-only">Remover</span>
            </Button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={aoEscolherArquivo} />
        </div>
      )}

      <CameraDialog
        aberto={camera}
        titulo={`${titulo} pela câmera`}
        onFechar={() => setCamera(false)}
        onCapturar={(foto) => void salvar(foto)}
      />

      <Dialog open={ampliada && endereco !== null} onOpenChange={setAmpliada}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          {endereco && <img src={endereco} alt={titulo} className="max-h-[75vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
