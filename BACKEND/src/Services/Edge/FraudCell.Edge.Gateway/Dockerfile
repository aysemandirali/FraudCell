# This Dockerfile must be built with BACKEND/ as the Docker build context.

FROM mcr.microsoft.com/dotnet/sdk:10.0.100 AS build
WORKDIR /src

COPY global.json Directory.Build.props Directory.Packages.props .editorconfig ./
COPY src/BuildingBlocks/FraudCell.BuildingBlocks/FraudCell.BuildingBlocks.csproj src/BuildingBlocks/FraudCell.BuildingBlocks/
COPY src/Services/Edge/FraudCell.Edge.Gateway/FraudCell.Edge.Gateway.csproj src/Services/Edge/FraudCell.Edge.Gateway/

RUN dotnet restore src/Services/Edge/FraudCell.Edge.Gateway/FraudCell.Edge.Gateway.csproj

COPY src/BuildingBlocks/FraudCell.BuildingBlocks/ src/BuildingBlocks/FraudCell.BuildingBlocks/
COPY src/Services/Edge/FraudCell.Edge.Gateway/ src/Services/Edge/FraudCell.Edge.Gateway/

RUN dotnet publish src/Services/Edge/FraudCell.Edge.Gateway/FraudCell.Edge.Gateway.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system fraudcell \
    && useradd --system --gid fraudcell --home-dir /app --shell /usr/sbin/nologin fraudcell \
    && mkdir -p /keys/identity \
    && chown -R fraudcell:fraudcell /app /keys/identity

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

USER fraudcell

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
    CMD curl -f http://localhost:8080/health/ready || exit 1

ENTRYPOINT ["dotnet", "FraudCell.Edge.Gateway.dll"]

