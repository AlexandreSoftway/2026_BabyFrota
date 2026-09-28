using BabyFrota.DTOs.Relatorios;

namespace BabyFrota.Services.Relatorios;

/// <summary>
/// Relatórios com a mesma saída de dados do legado. Cada chamada devolve o relatório inteiro, como o legado gerava:
/// as procedures não são paginadas, e a tela pagina e exporta a partir da mesma lista.
/// </summary>
public interface IRelatorioService
{
    /// <summary>SPRelatorioClientes (RelatorioClientes.rdlc).</summary>
    Task<List<ClienteRelatorioDto>> ListarClientesAsync(RelatorioClientesFiltro filtro, CancellationToken ct = default);

    /// <summary>"Histórico de Locações" do legado (HistLocacoes.rdlc): ocupação por caixa.</summary>
    Task<List<HistoricoOcupacaoDto>> ListarHistoricoOcupacaoAsync(RelatorioHistoricoFiltro filtro, CancellationToken ct = default);

    /// <summary>SPHistoricoLocacoes com as colunas do HistoricoLocacoesDetalhado.rdlc.</summary>
    Task<List<HistoricoLocacaoDetalhadoDto>> ListarHistoricoDetalhadoAsync(RelatorioHistoricoFiltro filtro, CancellationToken ct = default);

    /// <summary>SPHistoricoLocacoes com as colunas do HistoricoLocacoesSimplificado.rdlc.</summary>
    Task<List<HistoricoLocacaoSimplificadoDto>> ListarHistoricoSimplificadoAsync(RelatorioHistoricoFiltro filtro, CancellationToken ct = default);

    /// <summary>Usuários para os filtros "entregou" e "devolveu".</summary>
    Task<List<UsuarioFiltroDto>> ListarUsuariosAsync(CancellationToken ct = default);
}
