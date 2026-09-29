using BabyFrota.Data;
using BabyFrota.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Midias;

/// <summary>
/// Foto e documento do cliente e foto do carrinho, nas mesmas colunas que o legado usa (Foto/MimeFoto, Documento/MimeDocumento),
/// então o que um sistema grava o outro mostra. A tela reduz a imagem antes de enviar (a foto para 400 px, como o legado
/// reduzia para 250 px), e o servidor confere pelo conteúdo que é mesmo uma imagem e grava a extensão de 3 letras que o legado
/// usa para montar o "image/..." (jpg, png, gif, bmp).
/// </summary>
public class MidiaService : IMidiaService
{
    public const int TamanhoMaximoBytes = 5 * 1024 * 1024;

    private readonly AppDbContext _db;

    public MidiaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ArquivoMidia?> ObterAsync(TipoMidia tipo, int id, CancellationToken ct = default)
    {
        // Só a coluna da imagem pedida: não traz o resto do registro nem a outra imagem.
        var linha = tipo switch
        {
            TipoMidia.FotoCliente => await _db.Clientes.Where(c => c.Cdcliente == id)
                .Select(c => new ConteudoLido(c.Foto, c.MimeFoto)).FirstOrDefaultAsync(ct),
            TipoMidia.DocumentoCliente => await _db.Clientes.Where(c => c.Cdcliente == id)
                .Select(c => new ConteudoLido(c.Documento, c.MimeDocumento)).FirstOrDefaultAsync(ct),
            TipoMidia.FotoCarrinho => await _db.Carrinhos.Where(c => c.Cdcarrinho == id)
                .Select(c => new ConteudoLido(c.Foto, c.MimeFoto)).FirstOrDefaultAsync(ct),
            TipoMidia.FotoUsuario => await _db.Usuarios.Where(u => u.Cdusuario == id)
                .Select(u => new ConteudoLido(u.Foto, u.MimeFoto)).FirstOrDefaultAsync(ct),
            _ => throw new ArgumentOutOfRangeException(nameof(tipo)),
        };

        if (linha is null)
            throw new KeyNotFoundException(tipo switch
            {
                TipoMidia.FotoCarrinho => $"Carrinho {id} não encontrado.",
                TipoMidia.FotoUsuario => $"Usuário {id} não encontrado.",
                _ => $"Cliente {id} não encontrado.",
            });

        if (linha.Conteudo is not { Length: > 0 })
            return null;

        // Pelo conteúdo, e não pela extensão gravada: o legado tem "jpe" e "PNG" no banco.
        var contentType = Formato(linha.Conteudo)?.ContentType
            ?? (linha.Mime?.Trim().ToLowerInvariant() == "pdf" ? "application/pdf" : "application/octet-stream");
        return new ArquivoMidia(linha.Conteudo, contentType);
    }

    public async Task SalvarAsync(TipoMidia tipo, int id, byte[] conteudo, CancellationToken ct = default)
    {
        if (conteudo.Length == 0)
            throw new ArgumentException("O arquivo está vazio.");
        if (conteudo.Length > TamanhoMaximoBytes)
            throw new ArgumentException("A imagem passa de 5 MB.");

        var formato = Formato(conteudo)
            ?? throw new ArgumentException("Envie uma imagem (JPG, PNG, GIF ou BMP).");

        await AlterarAsync(tipo, id, conteudo, formato.Mime, ct);
    }

    public Task RemoverAsync(TipoMidia tipo, int id, CancellationToken ct = default)
        => AlterarAsync(tipo, id, conteudo: null, mime: null, ct);

    /// <summary>Carrega o registro e troca só as colunas da imagem: o EF grava só elas, e o log de auditoria registra a troca.</summary>
    private async Task AlterarAsync(TipoMidia tipo, int id, byte[]? conteudo, string? mime, CancellationToken ct)
    {
        switch (tipo)
        {
            case TipoMidia.FotoCliente:
                var clienteFoto = await ClienteAsync(id, ct);
                clienteFoto.Foto = conteudo;
                clienteFoto.MimeFoto = mime;
                break;

            case TipoMidia.DocumentoCliente:
                var clienteDocumento = await ClienteAsync(id, ct);
                clienteDocumento.Documento = conteudo;
                clienteDocumento.MimeDocumento = mime;
                break;

            case TipoMidia.FotoCarrinho:
                var carrinho = await _db.Carrinhos.FirstOrDefaultAsync(c => c.Cdcarrinho == id, ct)
                    ?? throw new KeyNotFoundException($"Carrinho {id} não encontrado.");
                carrinho.Foto = conteudo;
                carrinho.MimeFoto = mime;
                break;

            default:
                // A foto do usuário é só leitura (ver TipoMidia.FotoUsuario).
                throw new ArgumentOutOfRangeException(nameof(tipo));
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task<Cliente> ClienteAsync(int id, CancellationToken ct)
        => await _db.Clientes.FirstOrDefaultAsync(c => c.Cdcliente == id, ct)
            ?? throw new KeyNotFoundException($"Cliente {id} não encontrado.");

    /// <summary>Formato da imagem pelos primeiros bytes; nulo se não for JPG, PNG, GIF ou BMP.</summary>
    private static (string Mime, string ContentType)? Formato(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
            return ("jpg", "image/jpeg");
        if (bytes.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
            return ("png", "image/png");
        if (bytes.StartsWith("GIF87a"u8) || bytes.StartsWith("GIF89a"u8))
            return ("gif", "image/gif");
        if (bytes.StartsWith("BM"u8) && bytes.Length > 14)
            return ("bmp", "image/bmp");
        return null;
    }

    private sealed record ConteudoLido(byte[]? Conteudo, string? Mime);
}
