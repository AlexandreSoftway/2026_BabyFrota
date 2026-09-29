using BabyFrota.Data.Auditoria;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BabyFrota.Data;

/// <summary>
/// Ponto único de registro da camada de acesso a dados (EF Core + SQL Server) no container de DI.
/// O contexto se conecta ao MESMO banco do sistema legado (Database First) — não usamos
/// Migrations aqui para não divergir da estrutura já validada em produção.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddData(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection não configurada.");

        // Log de auditoria (TBLog) em toda gravação, como o legado. Quem está gravando vem de IAuditoriaContexto, que a
        // Api registra; sem ele (ex.: um teste), nada é auditado.
        services.AddSingleton<AuditoriaInterceptor>();

        services.AddDbContext<AppDbContext>((provider, options) =>
            options.AddInterceptors(provider.GetRequiredService<AuditoriaInterceptor>())
            .UseSqlServer(connectionString, sql =>
            {
                // maxRetryCount alto + CommandTimeout alto é uma combinação perigosa: uma única
                // query lenta/travada (ex.: table scan em tabela grande sem índice) é reexecutada
                // várias vezes antes de finalmente falhar, cada tentativa segurando uma conexão do
                // pool por até CommandTimeout segundos — isso pode levar minutos e, se acontecer em
                // paralelo em várias requisições, esgota o pool de conexões e trava o app inteiro
                // (sintoma: "tudo fica carregando para sempre" mesmo em páginas sem relação alguma).
                // Falha mais rápido aqui é preferível: o app já tem timeout no front (25s) e mostra
                // erro via toast em vez de spinner infinito.
                sql.EnableRetryOnFailure(maxRetryCount: 1, maxRetryDelay: TimeSpan.FromSeconds(3), errorNumbersToAdd: null);
                sql.CommandTimeout(20);
            }));

        return services;
    }
}
