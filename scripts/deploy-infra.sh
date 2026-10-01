#!/usr/bin/env bash
# Creates only rg-watchparty and deploys the resources defined in infra/main.bicep.
set -euo pipefail
RG=rg-watchparty
LOCATION=centralindia
DEPLOYMENT=watchparty-infra
ROOT=$(cd "$(dirname "$0")/.." && pwd)

az group create --name "$RG" --location "$LOCATION" >/dev/null
az deployment group create \
  --name "$DEPLOYMENT" \
  --resource-group "$RG" \
  --template-file "$ROOT/infra/main.bicep" \
  --parameters "$ROOT/infra/main.parameters.json" \
  --query properties.outputs -o json
