targetScope='resourceGroup'
@minLength(4) param uniqueSuffix string
param user1Email string
param user1Name string
@secure() param user1PasswordHash string
param user2Email string
param user2Name string
@secure() param user2PasswordHash string
@secure() param sessionSecret string
param budgetEmail string
var storageName='stwatchparty${uniqueSuffix}'
var webName='watchparty-${uniqueSuffix}'
var location=resourceGroup().location
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01'={name:storageName;location:location;sku:{name:'Standard_LRS'};kind:'StorageV2';properties:{allowBlobPublicAccess:false;allowSharedKeyAccess:false;minimumTlsVersion:'TLS1_2';supportsHttpsTrafficOnly:true}}
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01'={parent:storage;name:'default';properties:{cors:{corsRules:[{allowedOrigins:['https://${webName}.azurewebsites.net','http://localhost:3000'];allowedMethods:['GET','HEAD','PUT','OPTIONS'];allowedHeaders:['*'];exposedHeaders:['Content-Range','Accept-Ranges','Content-Length'];maxAgeInSeconds:3600}]}}}
resource movies 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01'={parent:blobService;name:'movies';properties:{publicAccess:'None'}}
resource plan 'Microsoft.Web/serverfarms@2022-03-01'={name:'asp-watchparty-${uniqueSuffix}';location:location;kind:'linux';sku:{name:'B1';tier:'Basic'};properties:{reserved:true}}
resource vault 'Microsoft.KeyVault/vaults@2023-07-01'={name:'kv-watchparty-${uniqueSuffix}';location:location;properties:{tenantId:subscription().tenantId;sku:{family:'A';name:'standard'};enableRbacAuthorization:true;enablePurgeProtection:true;publicNetworkAccess:'Enabled'}}
resource acs 'Microsoft.Communication/communicationServices@2023-03-31'={name:'acs-watchparty-${uniqueSuffix}';location:'global';properties:{dataLocation:'Asia Pacific'}}
resource app 'Microsoft.Web/sites@2022-03-01'={name:webName;location:location;identity:{type:'SystemAssigned'};properties:{serverFarmId:plan.id;httpsOnly:true;clientAffinityEnabled:true;siteConfig:{linuxFxVersion:'NODE|20-lts';alwaysOn:true;webSocketsEnabled:true;ftpsState:'Disabled';minTlsVersion:'1.2';appSettings:[{name:'APP_ORIGIN';value:'https://${webName}.azurewebsites.net'},{name:'USER1_EMAIL';value:user1Email},{name:'USER1_NAME';value:user1Name},{name:'USER2_EMAIL';value:user2Email},{name:'USER2_NAME';value:user2Name},{name:'STORAGE_ACCOUNT_NAME';value:storageName},{name:'SESSION_SECRET';value:'@Microsoft.KeyVault(SecretUri=${session.properties.vaultUri}secrets/SESSION-SECRET)'},{name:'USER1_PASSWORD_HASH';value:'@Microsoft.KeyVault(SecretUri=${session.properties.vaultUri}secrets/USER1-PASSWORD-HASH)'},{name:'USER2_PASSWORD_HASH';value:'@Microsoft.KeyVault(SecretUri=${session.properties.vaultUri}secrets/USER2-PASSWORD-HASH)'},{name:'ACS_CONNECTION_STRING';value:'@Microsoft.KeyVault(SecretUri=${session.properties.vaultUri}secrets/ACS-CONNECTION-STRING)'}]}}}
resource session 'Microsoft.KeyVault/vaults/secrets@2023-07-01'={parent:vault;name:'SESSION-SECRET';properties:{value:sessionSecret}}
resource u1 'Microsoft.KeyVault/vaults/secrets@2023-07-01'={parent:vault;name:'USER1-PASSWORD-HASH';properties:{value:user1PasswordHash}}
resource u2 'Microsoft.KeyVault/vaults/secrets@2023-07-01'={parent:vault;name:'USER2-PASSWORD-HASH';properties:{value:user2PasswordHash}}
resource acsSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01'={parent:vault;name:'ACS-CONNECTION-STRING';properties:{value:acs.listKeys().primaryConnectionString}}
var storageRole='ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var kvRole='4633458b-17de-408a-b874-0445c86b69e6'
resource storageAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01'={scope:storage;name:guid(storage.id,app.id,storageRole);properties:{roleDefinitionId:subscriptionResourceId('Microsoft.Authorization/roleDefinitions',storageRole);principalId:app.identity.principalId;principalType:'ServicePrincipal'}}
resource vaultAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01'={scope:vault;name:guid(vault.id,app.id,kvRole);properties:{roleDefinitionId:subscriptionResourceId('Microsoft.Authorization/roleDefinitions',kvRole);principalId:app.identity.principalId;principalType:'ServicePrincipal'}}
output webAppName string=webName
output storageAccountName string=storageName
output keyVaultName string=vault.name
resource budget 'Microsoft.Consumption/budgets@2023-05-01'={name:'watchparty-monthly';properties:{category:'Cost';amount:1000;timeGrain:'Monthly';timePeriod:{startDate:'2026-10-01';endDate:'2036-10-01'};notifications:{eighty:{enabled:true;operator:'GreaterThanOrEqualTo';threshold:80;contactEmails:[budgetEmail]};hundred:{enabled:true;operator:'GreaterThanOrEqualTo';threshold:100;contactEmails:[budgetEmail]}}}}
