#!/usr/bin/env bash
# Builds the web and server apps, prepares a deployment root, and zip-deploys it.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
RG=rg-watchparty
DEPLOYMENT=watchparty-infra
APP=${1:-$(az deployment group show --resource-group "$RG" --name "$DEPLOYMENT" --query properties.outputs.webAppName.value -o tsv)}

cd "$ROOT"
npm install
npm run build
rm -rf .deploy watchparty.zip
mkdir -p .deploy/server .deploy/web
cp -R server/dist .deploy/server/dist
cp -R web/dist .deploy/web/dist
node --input-type=module <<'NODE'
import fs from 'node:fs';
const server = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
fs.writeFileSync('.deploy/package.json', JSON.stringify({
  name: 'watchparty-deployment', private: true, type: 'module',
  scripts: { start: 'node server/dist/index.js' }, dependencies: server.dependencies
}, null, 2));
NODE
(cd .deploy && zip -qr ../watchparty.zip .)
# Oryx installs only the runtime dependencies from the deployment package.
az webapp config appsettings set --resource-group "$RG" --name "$APP" --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITE_NODE_DEFAULT_VERSION='~20' >/dev/null
az webapp deploy --resource-group "$RG" --name "$APP" --src-path "$ROOT/watchparty.zip" --type zip
printf 'Deployed: https://%s.azurewebsites.net\n' "$APP"
