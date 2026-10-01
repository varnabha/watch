#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); RG=rg-watchparty
(cd "$ROOT" && npm ci && npm run build && rm -rf .deploy && mkdir .deploy && cp -R server/dist web/dist server/package.json server/package-lock.json .deploy/ 2>/dev/null || true)
APP=${1:-$(az deployment group show -g "$RG" -n main --query properties.outputs.webAppName.value -o tsv)}
(cd "$ROOT/.deploy" && zip -qr ../watchparty.zip .)
az webapp deploy --resource-group "$RG" --name "$APP" --src-path "$ROOT/watchparty.zip" --type zip
