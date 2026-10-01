#!/usr/bin/env bash
set -euo pipefail
input=${1:?Usage: convert-movie.sh input.mkv output.mp4}; output=${2:?Usage: convert-movie.sh input.mkv output.mp4}
# Fast path (when input is already H.264/AAC): ffmpeg -i "$input" -c copy -movflags +faststart "$output"
ffmpeg -i "$input" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -ac 2 -movflags +faststart "$output"
# Subtitle example: ffmpeg -i "$input" -map 0:s:0 "${output%.*}.vtt"
