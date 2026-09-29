using System.IO.Compression;
using System.Text;
using BabyFrota.Api.Middleware;
using BabyFrota.Api.OpenApi;
using BabyFrota.Api.Security;
using BabyFrota.Data;
using BabyFrota.Data.Auditoria;
using BabyFrota.Domain.Enums;
using BabyFrota.Services;
using BabyFrota.Services.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ---------- Camadas da aplicação ----------
builder.Services.AddData(builder.Configuration);
builder.Services.AddApplicationServices(builder.Configuration);

// Quem está gravando (usuário do token e IP), para o log de auditoria em TBLog.
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IAuditoriaContexto, AuditoriaContextoHttp>();

// ---------- MVC / Controllers ----------
builder.Services.AddControllers();

// ---------- Compressão das respostas ----------
// O JSON das listas e relatórios encolhe de 7 a 14 vezes. Brotli em "Optimal" (no .NET é o nível 4, ainda rápido: no
// "Fastest" ele comprimia menos que o gzip) e gzip em "Fastest", para quem não aceita brotli. Vale também em HTTPS: o
// ataque BREACH depende de o navegador mandar a credencial sozinho (cookie) em pedidos forjados por outro site, e aqui o
// token vai no cabeçalho Authorization, posto pelo próprio front.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});
builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Optimal);
builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);

// ---------- OpenAPI (nativo .NET) + Bearer ----------
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

// ---------- CORS (para o front React em desenvolvimento) ----------
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ---------- Autenticação JWT ----------
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key não configurada.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

// ---------- Autorização por perfil (igual ao legado: menus/páginas por EPerfil) ----------
// O handler consulta o perfil atual no banco a cada requisição, não o claim "perfilId" do token — ver PerfilAuthorizationHandler.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Administrador", policy => policy.Requirements.Add(new PerfilRequirement((int)PerfilSistema.Administrador)));
    options.AddPolicy(
        "Supervisor",
        policy => policy.Requirements.Add(new PerfilRequirement((int)PerfilSistema.Administrador, (int)PerfilSistema.Gerente)));
});
builder.Services.AddScoped<IAuthorizationHandler, PerfilAuthorizationHandler>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, AcessoNegadoResultHandler>();

// ---------- Tratamento de exceções padronizado (ProblemDetails) ----------
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseResponseCompression();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "BabyFrota API v1");
        options.RoutePrefix = "swagger";
    });
}

// Em Development, o front (Vite) chama a API em HTTP puro (http://localhost:5025).
// Forçar redirect para HTTPS aqui quebraria a chamada: o browser seguiria o redirect
// para https://localhost:7017 (porta diferente => CORS falha, ou certificado dev não
// confiável => request bloqueada silenciosamente), e o front recebe um erro de rede
// sem "response" — que aparecia disfarçado de "credenciais inválidas".
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ---------- Seed do usuário administrativo (idempotente, sem Migrations) ----------
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<AdminUserSeeder>();
    await seeder.SeedAsync();
}

app.Run();
