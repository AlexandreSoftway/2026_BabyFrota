namespace BabyFrota.Services.Midias;

/// <summary>As imagens que o legado guardava no próprio registro (colunas image) e mostrava pelo Controle/UCImagem.aspx.</summary>
public enum TipoMidia
{
    FotoCliente,
    DocumentoCliente,
    FotoCarrinho,

    /// <summary>Só leitura: o sistema novo mostra a foto que o legado gravou no usuário, mas não troca.</summary>
    FotoUsuario,
}

public sealed record ArquivoMidia(byte[] Conteudo, string ContentType);

public interface IMidiaService
{
    /// <summary>A imagem; nula se o registro não tiver essa imagem. <see cref="KeyNotFoundException"/> se o registro não existir.</summary>
    Task<ArquivoMidia?> ObterAsync(TipoMidia tipo, int id, CancellationToken ct = default);

    Task SalvarAsync(TipoMidia tipo, int id, byte[] conteudo, CancellationToken ct = default);

    Task RemoverAsync(TipoMidia tipo, int id, CancellationToken ct = default);
}
