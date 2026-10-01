#!/usr/bin/env bash
set -euo pipefail
RG=rg-watchparty; LOCATION=centralindia; ROOT=$(cd "$(dirname "$0")/.." && pwd)
az group create --name "$RG" --location "$LOCATION" >/dev/null
az deployment group create --resource-group "$RG" --template-file "$ROOT/infra/main.bicep" --parameters "$ROOT/infra/main.parameters.json" --query properties.outputs -o json
