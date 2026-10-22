$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
$node = (Get-Command node.exe -ErrorAction Stop).Source
$env:DATA_DIR = Join-Path $root 'datos'
$logs = Join-Path $env:DATA_DIR 'registros'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$logFile = Join-Path $logs ('servidor-' + (Get-Date -Format 'yyyy-MM-dd') + '.log')
& $node (Join-Path $root 'server.js') *>> $logFile
exit $LASTEXITCODE
