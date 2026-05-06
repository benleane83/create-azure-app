import type { Feature } from '../composer.js';
import type { PackageManager } from '../utils.js';

interface InfraConfigOptions {
  projectName: string;
  orm: 'prisma' | 'drizzle';
  includeAuth: boolean;
  framework: 'nextjs' | 'vite-react' | 'sveltekit';
  packageManager: PackageManager;
}

export function infraFeature(config: InfraConfigOptions): Feature {
  return {
    name: 'infra',
    files: [
      { path: 'infra/modules/swa.bicep', content: swaBicep() },
      { path: 'infra/modules/postgres.bicep', content: postgresBicep() },
      { path: 'infra/modules/monitoring.bicep', content: monitoringBicep() },
      { path: 'infra/modules/keyvault.bicep', content: keyvaultBicep() },
      { path: 'infra/main.bicep', content: mainBicep() },
      { path: 'infra/main.parameters.json', content: mainParametersJson() },
      { path: 'azure.yaml', content: azureYaml(config) },
      { path: 'scripts/migrate.sh', content: migrateScript(config) },
      { path: 'scripts/migrate.ps1', content: migratePowershellScript(config) },
      { path: 'staticwebapp.config.json', content: baseSwaAppConfig() },
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
output instrumentationKey string = appInsights.properties.InstrumentationKey
output workspaceId string = logAnalytics.id
`;
}

function keyvaultBicep(): string {
  return `@description('Name of the Key Vault')
param name string

@description('Location for the Key Vault')
param location string

@description('Tags for the resource')
param tags object = {}

@description('Principal ID to grant Key Vault Secrets User role')
param principalId string

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

output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
output id string = keyVault.id
`;
}

// ---------------------------------------------------------------------------
// Root orchestration
// ---------------------------------------------------------------------------

function mainBicep(): string {
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

// Key Vault (with SWA managed identity access)
module keyvault 'modules/keyvault.bicep' = {
  scope: rg
  name: 'keyvault'
  params: {
    name: 'kv-\${resourceToken}'
    location: location
    tags: tags
    principalId: swa.outputs.principalId
  }
}

// Outputs — azd saves these as environment variables
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_SWA_NAME string = swa.outputs.name
output AZURE_SWA_HOSTNAME string = swa.outputs.defaultHostname
output AZURE_POSTGRESQL_HOST string = postgres.outputs.fqdn
output AZURE_POSTGRESQL_DATABASE string = postgres.outputs.databaseName
output AZURE_POSTGRESQL_ADMIN_LOGIN string = dbAdminLogin
output AZURE_APPINSIGHTS_CONNECTION_STRING string = monitoring.outputs.connectionString
output AZURE_KEY_VAULT_NAME string = keyvault.outputs.name
output AZURE_KEY_VAULT_URI string = keyvault.outputs.uri
`;
}

function mainParametersJson(): string {
  return JSON.stringify(
    {
      $schema:
        'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
      contentVersion: '1.0.0.0',
      parameters: {
        environmentName: { value: '${AZURE_ENV_NAME}' },
        location: { value: '${AZURE_LOCATION}' },
      },
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

  return `name: ${config.projectName}
metadata:
  template: create-azure-app
services:
  web:
    project: src/web
    dist: ${distDir}
    host: staticwebapp
  api:
    project: src/api
    host: function
    language: ts
hooks:
  prepackage:
    windows:
      shell: pwsh
      run: |
        cd src/web && ${installCmd} && ${buildCmd}
        cd ../api && ${installCmd} && ${buildCmd}
    posix:
      shell: sh
      run: |
        cd src/web && ${installCmd} && ${buildCmd}
        cd ../api && ${installCmd} && ${buildCmd}
  postprovision:
    windows:
      shell: pwsh
      run: scripts/migrate.ps1
    posix:
      shell: sh
      run: scripts/migrate.sh
`;
}

// ---------------------------------------------------------------------------
// Migration script
// ---------------------------------------------------------------------------

function migrateScript(config: InfraConfigOptions): string {
  const migrateCmd =
    config.orm === 'prisma'
      ? 'npx prisma migrate deploy --schema=db/schema.prisma'
      : 'npx drizzle-kit push';

  return `#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Running database migration..."

# Build DATABASE_URL from azd-provisioned resources
export DATABASE_URL="postgresql://\${AZURE_POSTGRESQL_ADMIN_LOGIN:-pgadmin}:\${dbAdminPassword}@\${AZURE_POSTGRESQL_HOST}:5432/\${AZURE_POSTGRESQL_DATABASE}?sslmode=require"

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
      : 'npx drizzle-kit push';

  return `$ErrorActionPreference = "Stop"

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location ..

Write-Host "Running database migration..."

# Build DATABASE_URL from azd-provisioned resources
$adminLogin = if ($env:AZURE_POSTGRESQL_ADMIN_LOGIN) { $env:AZURE_POSTGRESQL_ADMIN_LOGIN } else { "pgadmin" }
$env:DATABASE_URL = "postgresql://\${adminLogin}:\${env:dbAdminPassword}@\${env:AZURE_POSTGRESQL_HOST}:5432/\${env:AZURE_POSTGRESQL_DATABASE}?sslmode=require"

${migrateCmd}

Write-Host "Migration complete."
Pop-Location
`;
}

// ---------------------------------------------------------------------------
// Base SWA app config (overridden by auth feature when auth is enabled)
// ---------------------------------------------------------------------------

function baseSwaAppConfig(): string {
  return JSON.stringify(
    {
      navigationFallback: {
        rewrite: '/index.html',
        exclude: ['/images/*.{png,jpg,gif}', '/css/*', '/api/*'],
      },
      platform: {
        apiRuntime: 'node:20',
      },
    },
    null,
    2
  ) + '\n';
}
