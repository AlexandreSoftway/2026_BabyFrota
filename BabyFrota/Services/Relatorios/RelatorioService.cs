using System.Data;
using System.Data.Common;
using BabyFrota.Data;
using BabyFrota.DTOs.Relatorios;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Relatorios;

/// <summary>
/// Relatórios com a mesma saída do legado: chama as mesmas stored procedures (SPRelatorioClientes, SPHistoricoLocacoes)
/// com os mesmos parâmetros que as páginas .aspx passavam, e refaz em C# o único relatório que o legado calculava em
/// código (<see cref="OcupacaoCaixa"/>). Assim os dados saem iguais por construção, sem reescrever regra de SQL.
/// </summary>
public class RelatorioService : IRelatorioService
{
    /// <summary>
    /// As procedures são pesadas em períodos longos (o legado chegou a desligar o limite no Detalhado). Cinco minutos
    /// cobrem o uso normal sem deixar uma consulta presa para sempre.
    /// </summary>
    private const int TempoLimiteSegundos = 300;

    private readonly AppDbContext _db;

    public RelatorioService(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<ClienteRelatorioDto>> ListarClientesAsync(RelatorioClientesFiltro filtro, CancellationToken ct = default)
        => ExecutarProcedureAsync(
            "dbo.SPRelatorioClientes",
            comando =>
            {
                // Como a página do legado: texto vazio vai como '' (a procedure testa "= ''"; nulo não filtraria nada)
                // e cliente não escolhido vai como 0.
                Parametro(comando, "@CDCliente", DbType.Int32, filtro.ClienteId ?? 0);
                Parametro(comando, "@Cidade", DbType.String, filtro.Cidade ?? string.Empty);
                Parametro(comando, "@Complemento", DbType.String, filtro.Complemento ?? string.Empty);
                Parametro(comando, "@DTInicio", DbType.DateTime, filtro.DataCadastroInicio?.Date);
                Parametro(comando, "@DTFinal", DbType.DateTime, filtro.DataCadastroFinal?.Date);
                Parametro(comando, "@uf", DbType.String, filtro.Uf ?? string.Empty);
                Parametro(comando, "@DTInicioLocacao", DbType.DateTime, filtro.DataLocacaoInicio?.Date);
                Parametro(comando, "@DTFinalLocacao", DbType.DateTime, filtro.DataLocacaoFinal?.Date);
            },
            LeituraProcedures.Cliente,
            ct);

    public async Task<List<HistoricoOcupacaoDto>> ListarHistoricoOcupacaoAsync(RelatorioHistoricoFiltro filtro, CancellationToken ct = default)
    {
        var (inicio, fim, cdCarrinho, cdTipoCarrinho) = FiltroDoHistorico(filtro);
        // Igual ao legado: o último dia vai até o último milissegundo.
        var dataFinal = fim.AddDays(1).AddMilliseconds(-1);

        var caixas = await _db.CaixaMovimentos
            .Where(c => c.Dtabertura >= inicio && c.Dtfechamento != null && c.Dtfechamento <= dataFinal)
            .OrderBy(c => c.CdcaixaMovimento)
            .Select(c => new CaixaOcupacao(c.CdcaixaMovimento, c.Dtabertura, c.Dtfechamento!.Value))
            .ToListAsync(ct);

        var query = _db.Locacoes.Where(l => l.Dtentrega >= inicio && l.Dtdevolucao != null && l.Dtentrega <= dataFinal);
        if (cdCarrinho != 0)
            query = query.Where(l => l.Cdcarrinho == cdCarrinho);
        if (cdTipoCarrinho != 0)
            query = query.Where(l => l.CdcarrinhoNavigation.CdtipoCarrinho == cdTipoCarrinho);
        if (filtro.ClienteId is > 0)
            query = query.Where(l => l.Cdcliente == filtro.ClienteId.Value);
        if (filtro.UsuarioEntregaId is > 0)
            query = query.Where(l => l.CdusuarioEntrega == filtro.UsuarioEntregaId.Value);
        if (filtro.UsuarioDevolucaoId is > 0)
            query = query.Where(l => l.CdusuarioDevolucao == filtro.UsuarioDevolucaoId.Value);

        var locacoes = await query
            .OrderBy(l => l.Cdlocacao)
            .Select(l => new LocacaoOcupacao
            {
                Id = l.Cdlocacao,
                DtEntrega = l.Dtentrega,
                DtDevolucao = l.Dtdevolucao!.Value,
                ValorTotal = l.ValorTotal,
                DescricaoCarrinho = l.CdcarrinhoNavigation.Descricao,
                TipoCarrinho = l.CdcarrinhoNavigation.CdtipoCarrinhoNavigation.Descricao,
            })
            .ToListAsync(ct);

        return OcupacaoCaixa.Calcular(caixas, locacoes, filtroPorCarrinho: cdCarrinho != 0, filtroPorTipo: cdTipoCarrinho != 0);
    }

    public Task<List<HistoricoLocacaoDetalhadoDto>> ListarHistoricoDetalhadoAsync(RelatorioHistoricoFiltro filtro, CancellationToken ct = default)
    {
        var (inicio, fim, cdCarrinho, cdTipoCarrinho) = FiltroDoHistorico(filtro);

        return ExecutarProcedureAsync(
            "dbo.SPHistoricoLocacoes",
            comando =>
            {
                Parametro(comando, "@DTInicioEntrega", DbType.DateTime, inicio);
                Parametro(comando, "@DTFinalEntrega", DbType.DateTime, fim);
                Parametro(comando, "@CDCarrinho", DbType.Int32, cdCarrinho);
                Parametro(comando, "@CDTipoCarrinho", DbType.Int32, cdTipoCarrinho);
                Parametro(comando, "@CDCliente", DbType.Int32, filtro.ClienteId ?? 0);
                Parametro(comando, "@CDUsuarioEntrega", DbType.Int32, filtro.UsuarioEntregaId ?? 0);
                Parametro(comando, "@CDUsuarioDevolucao", DbType.Int32, filtro.UsuarioDevolucaoId ?? 0);
            },
            LeituraProcedures.Locacao,
            ct);
    }

    public async Task<List<HistoricoLocacaoSimplificadoDto>> ListarHistoricoSimplificadoAsync(RelatorioHistoricoFiltro filtro, CancellationToken ct = default)
        => (await ListarHistoricoDetalhadoAsync(filtro, ct)).Select(LeituraProcedures.Simplificado).ToList();

    public Task<List<UsuarioFiltroDto>> ListarUsuariosAsync(CancellationToken ct = default)
        => _db.Usuarios
            .OrderBy(u => u.Nome)
            .Select(u => new UsuarioFiltroDto { Id = u.Cdusuario, Nome = u.Nome })
            .ToListAsync(ct);

    /// <summary>
    /// As duas datas são obrigatórias, como no legado. Com carrinho escolhido, o tipo vai como 0: as páginas do legado
    /// zeravam o tipo nesse caso, e as procedures aplicam os dois filtros juntos.
    /// </summary>
    private static (DateTime Inicio, DateTime Fim, int CdCarrinho, int CdTipoCarrinho) FiltroDoHistorico(RelatorioHistoricoFiltro filtro)
    {
        if (filtro.DataEntregaInicio is null || filtro.DataEntregaFinal is null)
            throw new InvalidOperationException("Informe a data inicial e a data final da entrega.");

        var cdCarrinho = filtro.CarrinhoId ?? 0;
        var cdTipoCarrinho = cdCarrinho != 0 ? 0 : filtro.TipoCarrinhoId ?? 0;
        return (filtro.DataEntregaInicio.Value.Date, filtro.DataEntregaFinal.Value.Date, cdCarrinho, cdTipoCarrinho);
    }

    private async Task<List<T>> ExecutarProcedureAsync<T>(
        string procedure, Action<DbCommand> preencherParametros, Func<LeitorDeColunas, T> lerLinha, CancellationToken ct)
    {
        var conexao = _db.Database.GetDbConnection();
        await _db.Database.OpenConnectionAsync(ct);
        try
        {
            await using var comando = conexao.CreateCommand();
            comando.CommandText = procedure;
            comando.CommandType = CommandType.StoredProcedure;
            comando.CommandTimeout = TempoLimiteSegundos;
            preencherParametros(comando);

            await using var reader = await comando.ExecuteReaderAsync(ct);
            var leitor = new LeitorDeColunas(reader);
            var linhas = new List<T>();
            while (await reader.ReadAsync(ct))
                linhas.Add(lerLinha(leitor));
            return linhas;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private static void Parametro(DbCommand comando, string nome, DbType tipo, object? valor)
    {
        var parametro = comando.CreateParameter();
        parametro.ParameterName = nome;
        parametro.DbType = tipo;
        parametro.Value = valor ?? DBNull.Value;
        comando.Parameters.Add(parametro);
    }
}
