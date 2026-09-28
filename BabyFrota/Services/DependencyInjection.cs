using BabyFrota.Services.Auth;
using BabyFrota.Services.Bi;
using BabyFrota.Services.Caixas;
using BabyFrota.Services.Carrinhos;
using BabyFrota.Services.Ceps;
using BabyFrota.Services.Clientes;
using BabyFrota.Services.Dashboard;
using BabyFrota.Services.Empresas;
using BabyFrota.Services.Locacoes;
using BabyFrota.Services.Relatorios;
using BabyFrota.Services.Seed;
using BabyFrota.Services.Usuarios;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BabyFrota.Services;

/// <summary>Registro dos serviços de aplicação (regras de negócio) no container de DI.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<ITipoCarrinhoService, TipoCarrinhoService>();
        services.AddScoped<ICarrinhoService, CarrinhoService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IUsuarioService, UsuarioService>();
        services.AddScoped<IClienteService, ClienteService>();
        services.AddScoped<IEmpresaService, EmpresaService>();
        services.AddScoped<ICaixaService, CaixaService>();
        services.AddScoped<IFluxoCaixaService, FluxoCaixaService>();
        services.AddScoped<ILocacaoService, LocacaoService>();
        services.AddScoped<ILocacaoConsultaService, LocacaoConsultaService>();
        services.AddScoped<IRelatorioService, RelatorioService>();
        services.AddScoped<IBiService, BiService>();

        services.AddHttpClient("ViaCep", client =>
        {
            client.BaseAddress = new Uri("https://viacep.com.br/ws/");
            client.Timeout = TimeSpan.FromSeconds(8);
        });
        services.AddScoped<ICepService, CepService>();

        services.AddScoped<AdminUserSeeder>();

        return services;
    }
}
