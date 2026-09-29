using BabyFrota.Services.Midias;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

/// <summary>Ler, enviar e remover a imagem de um registro: o mesmo formato para a foto e o documento do cliente e a foto do carrinho.</summary>
internal static class MidiaHttp
{
    /// <summary>A imagem (até 5 MB) mais o envelope do multipart.</summary>
    public const long LimiteRequisicao = MidiaService.TamanhoMaximoBytes + 64 * 1024;

    /// <summary>204 quando o registro não tem essa imagem (não é erro: a tela só mostra o espaço vazio).</summary>
    public static async Task<IActionResult> ObterAsync(ControllerBase controller, IMidiaService service, TipoMidia tipo, int id, CancellationToken ct)
    {
        var arquivo = await service.ObterAsync(tipo, id, ct);
        if (arquivo is null)
            return controller.NoContent();

        // A mesma URL devolve outra imagem depois de uma troca: o navegador não pode reaproveitar a antiga.
        controller.Response.Headers.CacheControl = "no-store";
        return controller.File(arquivo.Conteudo, arquivo.ContentType);
    }

    public static async Task<IActionResult> SalvarAsync(
        ControllerBase controller, IMidiaService service, TipoMidia tipo, int id, IFormFile? arquivo, CancellationToken ct)
    {
        if (arquivo is null || arquivo.Length == 0)
            throw new ArgumentException("Escolha uma imagem para enviar.");
        if (arquivo.Length > MidiaService.TamanhoMaximoBytes)
            throw new ArgumentException("A imagem passa de 5 MB.");

        using var memoria = new MemoryStream((int)arquivo.Length);
        await arquivo.CopyToAsync(memoria, ct);
        await service.SalvarAsync(tipo, id, memoria.ToArray(), ct);
        return controller.NoContent();
    }

    public static async Task<IActionResult> RemoverAsync(ControllerBase controller, IMidiaService service, TipoMidia tipo, int id, CancellationToken ct)
    {
        await service.RemoverAsync(tipo, id, ct);
        return controller.NoContent();
    }
}
