using BabyFrota.DTOs.Carrinhos;

namespace BabyFrota.Services.Carrinhos;

/// <summary>Cadastro das faixas de preço de um tipo de carrinho, como na tela Tipo de Carrinho do legado.</summary>
public interface IPrecoLocacaoService
{
    Task<List<PrecoLocacaoDto>> ListarAsync(int tipoCarrinhoId, CancellationToken ct = default);
    Task<PrecoLocacaoDto> CriarAsync(int tipoCarrinhoId, PrecoLocacaoUpsertRequest request, CancellationToken ct = default);
    Task<PrecoLocacaoDto> AtualizarAsync(int id, PrecoLocacaoUpsertRequest request, CancellationToken ct = default);
    Task ExcluirAsync(int id, CancellationToken ct = default);
}
