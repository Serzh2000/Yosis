# Local launcher for machines with an incorrectly quoted Node entry in PATH.
# Changes only this process and its child processes.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NpmArguments)
$ErrorActionPreference = 'Stop'
$taskNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $taskNode) { $taskNode = Join-Path $env:ProgramFiles 'nodejs/node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Install Node.js 22.12 or newer on the development machine.' }
$taskNodeDirectory = Split-Path -Parent $taskNode
$taskNpm = Join-Path $taskNodeDirectory 'node_modules/npm/bin/npm-cli.js'
$env:PATH = $taskNodeDirectory + ';' + (($env:PATH -split ';' | ForEach-Object { $_.Trim().Trim('"') } | Where-Object { $_ }) -join ';')
& $taskNode $taskNpm @NpmArguments
exit $LASTEXITCODE
