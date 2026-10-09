param(
  [switch]$NoSend
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$copilotDir = Join-Path $repoRoot "internal-review-copilot"
$logDir = Join-Path $copilotDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "patrol-external-groups-$stamp.log"

Push-Location $repoRoot
try {
  $args = @("tsx", "internal-review-copilot/scripts/patrol-external-groups.ts")
  if (-not $NoSend) {
    $args += "--send"
  }

  "[$(Get-Date -Format o)] start: npx $($args -join ' ')" | Tee-Object -FilePath $logFile
  & npx @args 2>&1 | Tee-Object -FilePath $logFile -Append
  if ($LASTEXITCODE -ne 0) {
    throw "patrol command failed with exit code $LASTEXITCODE"
  }
  "[$(Get-Date -Format o)] done" | Tee-Object -FilePath $logFile -Append
} finally {
  Pop-Location
}
