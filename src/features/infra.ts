import type { Feature } from '../composer.js';
import { pmRun, type PackageManager } from '../utils.js';

interface InfraConfigOptions {
  projectName: string;
  orm: 'prisma' | 'drizzle';
  includeAuth: boolean;
  includeDatabase: boolean;
  framework: 'nextjs' | 'vite-react' | 'sveltekit';
  packageManager: PackageManager;
}

export function infraFeature(config: InfraConfigOptions): Feature {
  return {
    name: 'infra',
    files: [
      { path: 'infra/modules/swa.bicep', content: swaBicep() },
      ...(config.includeDatabase ? [
        { path: 'infra/modules/postgres.bicep', content: postgresBicep() },
        { path: 'infra/modules/keyvault.bicep', content: keyvaultBicep() },
      ] : []),
      { path: 'infra/modules/monitoring.bicep', content: monitoringBicep() },
      { path: 'infra/modules/swa-appsettings.bicep', content: swaAppSettingsBicep(config.includeDatabase) },
      { path: 'infra/main.bicep', content: mainBicep(config) },
      { path: 'infra/main.parameters.json', content: mainParametersJson(config.includeDatabase) },
      { path: 'azure.yaml', content: azureYaml(config) },
      ...(config.includeDatabase ? [
        { path: 'scripts/load-azd-env.sh', content: loadAzdEnvScript() },
        { path: 'scripts/load-azd-env.ps1', content: loadAzdEnvPowershellScript() },
        { path: 'scripts/migrate.sh', content: migrateScript(config) },
        { path: 'scripts/migrate.ps1', content: migratePowershellScript(config) },
        { path: 'scripts/seed.sh', content: seedScript(config) },
        { path: 'scripts/seed.ps1', content: seedPowershellScript(config) },
      ] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Bicep modules
// ---------------------------------------------------------------------------

function swaBicep(): string {
  return `@description('Name of the Static Web App')
param name string

@description('Location for the Static Web App')
param location string

@description('Tags for the resource')
param tags object = {}

@description('SKU for the Static Web App')
@allowed([
  'Standard'
])
param sku string = 'Standard'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: {
    name: sku
    tier: sku
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output id string = staticWebApp.id
output principalId string = staticWebApp.identity.principalId
`;
}

function postgresBicep(): string {
  return `@description('Name of the PostgreSQL Flexible Server')
param name string

@description('Location for the PostgreSQL server')
param location string

@description('Tags for the resource')
param tags object = {}

@description('Administrator login name')
param administratorLogin string

@secure()
@description('Administrator login password')
param administratorLoginPassword string

@description('SKU name for the PostgreSQL server')
param skuName string = 'Standard_B1ms'

@description('SKU tier for the PostgreSQL server')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param skuTier string = 'Burstable'

@description('Storage size in GB')
param storageSizeGB int = 32

@description('PostgreSQL version')
param version string = '16'

@description('Name of the database to create')
param databaseName string

@description('Additional firewall rules')
param firewallRules array = []

@description('Object ID of the Entra ID administrator (leave empty to skip)')
param entraAdminObjectId string = ''

@description('Display name of the Entra ID administrator')
param entraAdminName string = ''

@description('Type of the Entra ID administrator principal')
@allowed([
  'User'
  'Group'
  'ServicePrincipal'
])
param entraAdminType string = 'User'

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: version
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
    }
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: server
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

@batchSize(1)
resource customFirewallRules 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = [for rule in firewallRules: {
  parent: server
  name: rule.name
  properties: {
    startIpAddress: rule.startIpAddress
    endIpAddress: rule.endIpAddress
  }
}]

resource entraAdmin 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2024-08-01' = if (!empty(entraAdminObjectId)) {
  parent: server
  name: entraAdminObjectId
  properties: {
    principalType: entraAdminType
    principalName: entraAdminName
    tenantId: subscription().tenantId
  }
  dependsOn: [database]
}

output fqdn string = server.properties.fullyQualifiedDomainName
output name string = server.name
output databaseName string = databaseName
output id string = server.id
`;
}

function monitoringBicep(): string {
  return `@description('Base name for the monitoring resources')
param name string

@description('Location for the resources')
param location string

@description('Tags for the resources')
param tags object = {}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '\${name}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

output connectionString string = appInsights.properties.ConnectionString
output workspaceId string = logAnalytics.id
`;
}

function swaAppSettingsBicep(includeDatabase: boolean): string {
  const dbParam = includeDatabase ? `
@secure()
@description('The PostgreSQL connection string to set as DATABASE_URL')
param databaseUrl string
` : '';

  const dbSetting = includeDatabase ? `\n    DATABASE_URL: databaseUrl` : '';

  return `@description('Name of the existing Static Web App')
param swaName string

@description('Application Insights connection string')
param appInsightsConnectionString string
${dbParam}
resource swa 'Microsoft.Web/staticSites@2023-12-01' existing = {
  name: swaName
}

resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsightsConnectionString${dbSetting}
  }
}
`;
}

function keyvaultBicep(): string {
  return `@description('Name of the Key Vault')
param name string

@description('Location for the Key Vault')
param location string

@description('Tags for the resource')
param tags object = {}

@description('Principal ID to grant Key Vault Secrets User role (SWA managed identity)')
param principalId string

@description('Principal ID of the deployer to grant Key Vault Secrets User role for migrations')
param deployerPrincipalId string

@secure()
@description('PostgreSQL connection string to store as a secret')
param databaseUrl string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// Store DATABASE_URL as a Key Vault secret
resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'DATABASE-URL'
  properties: {
    value: databaseUrl
  }
}

// Grant the SWA managed identity "Key Vault Secrets User" role
resource keyVaultSecretUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, principalId, '4633458b-17de-408a-b874-0445c86b69e6')
  properties: {
    principalId: principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalType: 'ServicePrincipal'
  }
}

// Grant the deployer "Key Vault Secrets User" role so postprovision migration scripts can read the secret
resource deployerKeyVaultSecretUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, deployerPrincipalId, '4633458b-17de-408a-b874-0445c86b69e6')
  properties: {
    principalId: deployerPrincipalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalType: 'User'
  }
}

output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
output id string = keyVault.id
output databaseUrlSecretUri string = databaseUrlSecret.properties.secretUri
`;
}

// ---------------------------------------------------------------------------
// Root orchestration
// ---------------------------------------------------------------------------

function mainBicep(config: InfraConfigOptions): string {
  if (!config.includeDatabase) {
    return `targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment used to generate a unique resource token')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

var tags = {
  'azd-env-name': environmentName
}
var resourceToken = uniqueString(subscription().subscriptionId, environmentName, location)

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-\${environmentName}'
  location: location
  tags: tags
}

// Static Web App
module swa 'modules/swa.bicep' = {
  scope: rg
  name: 'swa'
  params: {
    name: 'swa-\${resourceToken}'
    location: location
    tags: tags
  }
}

// Monitoring (Log Analytics + Application Insights)
module monitoring 'modules/monitoring.bicep' = {
  scope: rg
  name: 'monitoring'
  params: {
    name: 'ai-\${resourceToken}'
    location: location
    tags: tags
  }
}

// Inject app settings into SWA
module swaAppSettings 'modules/swa-appsettings.bicep' = {
  scope: rg
  name: 'swa-appsettings'
  params: {
    swaName: swa.outputs.name
    appInsightsConnectionString: monitoring.outputs.connectionString
  }
}

// Outputs — azd saves these as environment variables
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_SWA_NAME string = swa.outputs.name
output AZURE_SWA_HOSTNAME string = swa.outputs.defaultHostname
output AZURE_APPINSIGHTS_CONNECTION_STRING string = monitoring.outputs.connectionString
`;
  }

  return `targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment used to generate a unique resource token')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('PostgreSQL administrator login')
param dbAdminLogin string = 'pgadmin'

@secure()
@description('PostgreSQL administrator password')
param dbAdminPassword string

@description('Principal ID of the deployer (used to grant Key Vault access for migrations)')
param deployerPrincipalId string = ''

var tags = {
  'azd-env-name': environmentName
}
var resourceToken = uniqueString(subscription().subscriptionId, environmentName, location)

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-\${environmentName}'
  location: location
  tags: tags
}

// Static Web App
module swa 'modules/swa.bicep' = {
  scope: rg
  name: 'swa'
  params: {
    name: 'swa-\${resourceToken}'
    location: location
    tags: tags
  }
}

// PostgreSQL Flexible Server
module postgres 'modules/postgres.bicep' = {
  scope: rg
  name: 'postgres'
  params: {
    name: 'psql-\${resourceToken}'
    location: location
    tags: tags
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
    databaseName: environmentName
  }
}

// Monitoring (Log Analytics + Application Insights)
module monitoring 'modules/monitoring.bicep' = {
  scope: rg
  name: 'monitoring'
  params: {
    name: 'ai-\${resourceToken}'
    location: location
    tags: tags
  }
}

// Key Vault — stores DATABASE_URL secret, grants SWA managed identity access
module keyvault 'modules/keyvault.bicep' = {
  scope: rg
  name: 'keyvault'
  params: {
    name: 'kv-\${resourceToken}'
    location: location
    tags: tags
    principalId: swa.outputs.principalId
    deployerPrincipalId: deployerPrincipalId
    databaseUrl: 'postgresql://\${dbAdminLogin}:\${dbAdminPassword}@\${postgres.outputs.fqdn}:5432/\${postgres.outputs.databaseName}?sslmode=require'
  }
}

// Inject app settings into SWA — DATABASE_URL set directly (SWA managed functions don't resolve Key Vault references)
module swaAppSettings 'modules/swa-appsettings.bicep' = {
  scope: rg
  name: 'swa-appsettings'
  params: {
    swaName: swa.outputs.name
    appInsightsConnectionString: monitoring.outputs.connectionString
    databaseUrl: 'postgresql://\${dbAdminLogin}:\${dbAdminPassword}@\${postgres.outputs.fqdn}:5432/\${postgres.outputs.databaseName}?sslmode=require'
  }
}

// Outputs — azd saves these as environment variables
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_SWA_NAME string = swa.outputs.name
output AZURE_SWA_HOSTNAME string = swa.outputs.defaultHostname
output AZURE_POSTGRESQL_HOST string = postgres.outputs.fqdn
output AZURE_POSTGRESQL_SERVER_NAME string = postgres.outputs.name
output AZURE_POSTGRESQL_DATABASE string = postgres.outputs.databaseName
output AZURE_POSTGRESQL_ADMIN_LOGIN string = dbAdminLogin
output AZURE_APPINSIGHTS_CONNECTION_STRING string = monitoring.outputs.connectionString
output AZURE_KEY_VAULT_NAME string = keyvault.outputs.name
output AZURE_KEY_VAULT_URI string = keyvault.outputs.uri
`;
}

function mainParametersJson(includeDatabase: boolean): string {
  const parameters: Record<string, unknown> = {
    environmentName: { value: '${AZURE_ENV_NAME}' },
    location: { value: '${AZURE_LOCATION}' },
  };
  if (includeDatabase) {
    parameters['dbAdminPassword'] = { value: '${AZURE_DB_ADMIN_PASSWORD}' };
    parameters['deployerPrincipalId'] = { value: '${AZURE_PRINCIPAL_ID}' };
  }
  return JSON.stringify(
    {
      $schema:
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
      contentVersion: '1.0.0.0',
      parameters,
    },
    null,
    2
  ) + '\n';
}

// ---------------------------------------------------------------------------
// azure.yaml
// ---------------------------------------------------------------------------

function azureYaml(config: InfraConfigOptions): string {
  const distDir = config.framework === 'nextjs' ? 'out'
    : config.framework === 'vite-react' ? 'dist'
    : 'build';

  const installCmd = config.packageManager === 'yarn' ? 'yarn install' : `${config.packageManager} install`;
  const buildCmd = config.packageManager === 'yarn' ? 'yarn build' : `${config.packageManager} run build`;
    const generateCmd = pmRun(config.packageManager, 'db:generate');

  const isPrisma = config.includeDatabase && config.orm === 'prisma';
  const prismaPreWin = isPrisma ? `
        ${generateCmd}
` : '';
  const prismaPostWin = isPrisma ? `
        cd ../..
        node scripts/sync-prisma-client.mjs
        node scripts/slim-swa-api-package.mjs
        Get-ChildItem "src/api/node_modules/.prisma/client" -Filter *.node | Where-Object { $_.Name -notlike '*debian*' } | Remove-Item -Force -ErrorAction SilentlyContinue
` : '';
  const prismaPrePosix = isPrisma ? `
        ${generateCmd}
` : '';
  const prismaPostPosix = isPrisma ? `
        cd ../..
        node scripts/sync-prisma-client.mjs
        node scripts/slim-swa-api-package.mjs
        find src/api/node_modules/.prisma/client -name "*.node" ! -name "*debian*" -delete 2>/dev/null || true
` : '';

  return `name: ${config.projectName}
metadata:
  template: create-azure-app
services:
  web:
    project: src/web
    dist: ${distDir}
    host: staticwebapp
    config:
      apiDir: src/api
hooks:
  prepackage:
    windows:
      shell: pwsh
      run: |${prismaPreWin}
        cd src/web && ${installCmd} && ${buildCmd}
        cd ../api && ${installCmd} && ${buildCmd}${prismaPostWin}
    posix:
      shell: sh
      run: |${prismaPrePosix}
        cd src/web && ${installCmd} && ${buildCmd}
        cd ../api && ${installCmd} && ${buildCmd}${prismaPostPosix}${config.includeDatabase ? `
  postprovision:
    windows:
      shell: pwsh
      run: scripts/migrate.ps1
    posix:
      shell: sh
      run: scripts/migrate.sh` : ''}
`;
}

// ---------------------------------------------------------------------------
// Migration script
// ---------------------------------------------------------------------------

function loadAzdEnvScript(): string {
  return `#!/bin/bash

script_dir="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
config_path="$repo_root/.azure/config.json"

if [ ! -f "$config_path" ]; then
  return 0
fi

if [ -n "\${AZURE_ENV_NAME:-}" ]; then
  environment_name="$AZURE_ENV_NAME"
else
  environment_name="$(node -e "const fs = require('fs'); try { const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (config.defaultEnvironment) process.stdout.write(config.defaultEnvironment); } catch {}" "$config_path")"
fi

if [ -z "$environment_name" ]; then
  return 0
fi

env_file_path="$repo_root/.azure/$environment_name/.env"
if [ ! -f "$env_file_path" ]; then
  return 0
fi

while IFS='=' read -r name value; do
  if [ -z "$name" ]; then
    continue
  fi

  case "$name" in
    \#*)
      continue
      ;;
  esac

  if [ -z "\${!name:-}" ]; then
    if [ "\${value#\"}" != "$value" ] && [ "\${value%\"}" != "$value" ]; then
      value="\${value#\"}"
      value="\${value%\"}"
    elif [ "\${value#\'}" != "$value" ] && [ "\${value%\'}" != "$value" ]; then
      value="\${value#\'}"
      value="\${value%\'}"
    fi

    export "$name=$value"
  fi
done < "$env_file_path"
`;
}

function loadAzdEnvPowershellScript(): string {
  return `$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$configPath = Join-Path $repoRoot ".azure/config.json"

if (-not (Test-Path $configPath)) {
  return
}

try {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json
} catch {
  return
}

$environmentName = if ($env:AZURE_ENV_NAME) {
  $env:AZURE_ENV_NAME
} else {
  $config.defaultEnvironment
}

if (-not $environmentName) {
  return
}

$envFilePath = Join-Path $repoRoot ".azure/$environmentName/.env"
if (-not (Test-Path $envFilePath)) {
  return
}

foreach ($line in Get-Content $envFilePath) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
    continue
  }

  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) {
    continue
  }

  $name = $parts[0].Trim()
  $value = $parts[1].Trim()
  if (-not $name) {
    continue
  }

  if ($value.Length -ge 2) {
    $startsWithDoubleQuote = $value.StartsWith('"') -and $value.EndsWith('"')
    $startsWithSingleQuote = $value.StartsWith("'") -and $value.EndsWith("'")
    if ($startsWithDoubleQuote -or $startsWithSingleQuote) {
      $value = $value.Substring(1, $value.Length - 2)
    }
  }

  if (-not (Get-Item "Env:$name" -ErrorAction SilentlyContinue)?.Value) {
    Set-Item -Path "Env:$name" -Value $value
  }
}
`;
}

function migrateScript(config: InfraConfigOptions): string {
  const migrateCmd =
    config.orm === 'prisma'
      ? 'npx prisma migrate deploy --schema=db/schema.prisma'
      : 'npx drizzle-kit migrate';

  return `#!/bin/bash
set -e

cd "$(dirname "$0")/.."
. "$(pwd)/scripts/load-azd-env.sh"

echo "Running database migration..."

# Always retrieve DATABASE_URL from Key Vault — never trust a locally-set value
# (Prisma auto-loads .env, so an existing DATABASE_URL would silently migrate localhost).
echo "Retrieving DATABASE_URL from Key Vault..."
export DATABASE_URL=$(az keyvault secret show \\
  --vault-name "$AZURE_KEY_VAULT_NAME" \\
  --name "DATABASE-URL" \\
  --query value -o tsv)
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: Failed to retrieve DATABASE_URL from Key Vault '$AZURE_KEY_VAULT_NAME'" >&2
  exit 1
fi

# Add a temporary firewall rule to allow this machine to reach PostgreSQL.
MY_IP=$(curl -s https://api.ipify.org)
echo "Opening firewall for \$MY_IP..."
az postgres flexible-server firewall-rule create \\
  --resource-group "\$AZURE_RESOURCE_GROUP" \\
  --name "\$AZURE_POSTGRESQL_SERVER_NAME" \\
  --rule-name "MigrationTemp" \\
  --start-ip-address "\$MY_IP" \\
  --end-ip-address "\$MY_IP" \\
  --output none

cleanup() {
  echo "Removing temporary firewall rule..."
  az postgres flexible-server firewall-rule delete \\
    --resource-group "\$AZURE_RESOURCE_GROUP" \\
    --name "\$AZURE_POSTGRESQL_SERVER_NAME" \\
    --rule-name "MigrationTemp" \\
    --yes --output none
}
trap cleanup EXIT

${migrateCmd}

echo "Migration complete."
`;
}

// ---------------------------------------------------------------------------
// Migration script (PowerShell — Windows)
// ---------------------------------------------------------------------------

function migratePowershellScript(config: InfraConfigOptions): string {
  const migrateCmd =
    config.orm === 'prisma'
      ? 'npx prisma migrate deploy --schema=db/schema.prisma'
      : 'npx drizzle-kit migrate';

  return `$ErrorActionPreference = "Stop"

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location ..
. (Join-Path (Get-Location) "scripts/load-azd-env.ps1")

Write-Host "Running database migration..."

# Always retrieve DATABASE_URL from Key Vault — never trust a locally-set value
# (Prisma auto-loads .env, so an existing DATABASE_URL would silently migrate localhost).
Write-Host "Retrieving DATABASE_URL from Key Vault..."
$env:DATABASE_URL = az keyvault secret show \`
  --vault-name $env:AZURE_KEY_VAULT_NAME \`
  --name "DATABASE-URL" \`
  --query value -o tsv
if (-not $env:DATABASE_URL) {
  Write-Error "Failed to retrieve DATABASE_URL from Key Vault '$env:AZURE_KEY_VAULT_NAME'"
  exit 1
}

# Add a temporary firewall rule to allow this machine to reach PostgreSQL.
$myIp = (Invoke-RestMethod -Uri "https://api.ipify.org")
Write-Host "Opening firewall for $myIp..."
az postgres flexible-server firewall-rule create \`
  --resource-group $env:AZURE_RESOURCE_GROUP \`
  --name $env:AZURE_POSTGRESQL_SERVER_NAME \`
  --rule-name "MigrationTemp" \`
  --start-ip-address $myIp \`
  --end-ip-address $myIp \`
  --output none 2>&1

try {
  ${migrateCmd}
} finally {
  Write-Host "Removing temporary firewall rule..."
  az postgres flexible-server firewall-rule delete \`
    --resource-group $env:AZURE_RESOURCE_GROUP \`
    --name $env:AZURE_POSTGRESQL_SERVER_NAME \`
    --rule-name "MigrationTemp" \`
    --yes --output none 2>&1
}

Write-Host "Migration complete."
Pop-Location
`;
}

function seedCommand(config: InfraConfigOptions): string {
  return config.orm === 'prisma'
    ? 'npx tsx db/seed.ts'
    : 'npx tsx src/api/src/db/seed.ts';
}

// ---------------------------------------------------------------------------
// Seed script (POSIX)
// ---------------------------------------------------------------------------

function seedScript(config: InfraConfigOptions): string {
  const seedCmd = seedCommand(config);

  return `#!/bin/bash
set -e

cd "$(dirname "$0")/.."
. "$(pwd)/scripts/load-azd-env.sh"

echo "🌱 Seeding Azure database..."

# Prefer DATABASE_URL if already set, otherwise retrieve from Key Vault.
if [ -z "$DATABASE_URL" ]; then
  echo "Retrieving DATABASE_URL from Key Vault..."
  export DATABASE_URL=$(az keyvault secret show \\
    --vault-name "$AZURE_KEY_VAULT_NAME" \\
    --name "DATABASE-URL" \\
    --query value -o tsv)
fi

# Open temporary firewall rule for local machine
MY_IP=$(curl -s https://api.ipify.org)
echo "Opening firewall for \$MY_IP..."
az postgres flexible-server firewall-rule create \\
  --resource-group "\$AZURE_RESOURCE_GROUP" \\
  --name "\$AZURE_POSTGRESQL_SERVER_NAME" \\
  --rule-name "seed-temp-\$\$" \\
  --start-ip-address "\$MY_IP" \\
  --end-ip-address "\$MY_IP" 2>/dev/null || true

${seedCmd}

# Close temporary firewall rule
echo "Closing firewall rule..."
az postgres flexible-server firewall-rule delete \\
  --resource-group "\$AZURE_RESOURCE_GROUP" \\
  --name "\$AZURE_POSTGRESQL_SERVER_NAME" \\
  --rule-name "seed-temp-\$\$" \\
  --yes 2>/dev/null || true

echo "✅ Seed complete."
`;
}

// ---------------------------------------------------------------------------
// Seed script (PowerShell — Windows)
// ---------------------------------------------------------------------------

function seedPowershellScript(config: InfraConfigOptions): string {
  const seedCmd = seedCommand(config);

  return `$ErrorActionPreference = "Stop"

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location ..
. (Join-Path (Get-Location) "scripts/load-azd-env.ps1")

Write-Host "🌱 Seeding Azure database..."

# Prefer DATABASE_URL if already set, otherwise retrieve from Key Vault.
if (-not $env:DATABASE_URL) {
  Write-Host "Retrieving DATABASE_URL from Key Vault..."
  $env:DATABASE_URL = az keyvault secret show \`
    --vault-name $env:AZURE_KEY_VAULT_NAME \`
    --name "DATABASE-URL" \`
    --query value -o tsv
}

# Open temporary firewall rule for local machine
$myIp = (Invoke-RestMethod -Uri "https://api.ipify.org")
$ruleName = "seed-temp-$(Get-Random)"
Write-Host "Opening firewall for $myIp..."
az postgres flexible-server firewall-rule create \`
  --resource-group $env:AZURE_RESOURCE_GROUP \`
  --name $env:AZURE_POSTGRESQL_SERVER_NAME \`
  --rule-name $ruleName \`
  --start-ip-address $myIp \`
  --end-ip-address $myIp 2>$null

try {
  ${seedCmd}
} finally {
  Write-Host "Closing firewall rule..."
  az postgres flexible-server firewall-rule delete \`
    --resource-group $env:AZURE_RESOURCE_GROUP \`
    --name $env:AZURE_POSTGRESQL_SERVER_NAME \`
    --rule-name $ruleName \`
    --yes 2>$null
}

Write-Host "✅ Seed complete."
Pop-Location
`;
}

// ---------------------------------------------------------------------------
// Base SWA app config (overridden by auth feature when auth is enabled)
// ---------------------------------------------------------------------------


