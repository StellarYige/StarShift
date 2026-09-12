param([Parameter(Mandatory=$true)][string]$Profile)
$ErrorActionPreference = 'Stop'
$taskProfile = (Resolve-Path -LiteralPath $Profile).Path
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../.cache/performance')).Path + '\'
if (-not $taskProfile.StartsWith($taskRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup requires a harness-owned performance profile' }
$taskProcesses = @(Get-CimInstance Win32_Process)
$taskPids = [System.Collections.Generic.HashSet[int]]::new()
foreach ($taskProcess in $taskProcesses) {
  if ($taskProcess.Name -eq 'chrome.exe' -and $taskProcess.CommandLine -and $taskProcess.CommandLine.Contains($taskProfile)) { [void]$taskPids.Add([int]$taskProcess.ProcessId) }
}
do {
  $taskAdded = $false
  foreach ($taskProcess in $taskProcesses) {
    if ($taskPids.Contains([int]$taskProcess.ParentProcessId) -and $taskPids.Add([int]$taskProcess.ProcessId)) { $taskAdded = $true }
  }
} while ($taskAdded)
foreach ($taskPid in $taskPids) { Stop-Process -Id $taskPid -Force -ErrorAction SilentlyContinue }
[pscustomobject]@{ stoppedOwnedProcesses = @($taskPids) } | ConvertTo-Json -Compress
