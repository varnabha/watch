#!/usr/bin/env bash
set -euo pipefail
ACCOUNT=${1:?Usage: upload-movie.sh STORAGE_ACCOUNT file.mp4}; FILE=${2:?Usage: upload-movie.sh STORAGE_ACCOUNT file.mp4}
az storage blob upload --auth-mode login --account-name "$ACCOUNT" --container-name movies --name "$(basename "$FILE")" --file "$FILE" --overwrite
# For large files, use a short user-delegation SAS with azcopy: azcopy copy "$FILE" 'https://ACCOUNT.blob.core.windows.net/movies/NAME?<user-delegation-sas>'
