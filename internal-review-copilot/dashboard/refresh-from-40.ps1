$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$OutDir = Join-Path $Root "_runs\dashboard_current"
$OutFile = Join-Path $OutDir "from40-current.jsonl"
New-Item -ItemType Directory -Force $OutDir | Out-Null

scp "winit@172.16.3.40:/workspace/projects/value-service/vas-internal-review/eval/ai-human-comparison.jsonl" $OutFile
node (Join-Path $PSScriptRoot "build-data.mjs")
node (Join-Path $PSScriptRoot "check-logic.mjs")

Write-Host "dashboard data refreshed from 40: $OutFile"
