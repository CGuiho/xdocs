param(
  [string]$Version = $(if ($env:XDOCS_VERSION) { $env:XDOCS_VERSION } else { "latest" }),
  [string]$InstallDir = $(if ($env:XDOCS_INSTALL_DIR) { $env:XDOCS_INSTALL_DIR } else { Join-Path $HOME ".local\bin" })
)

$ErrorActionPreference = "Stop"
$Owner = "CGuiho"
$Repository = "xdocs"

$Architecture = if ($env:PROCESSOR_ARCHITEW6432) {
  $env:PROCESSOR_ARCHITEW6432.ToUpperInvariant()
} else {
  $env:PROCESSOR_ARCHITECTURE.ToUpperInvariant()
}
switch ($Architecture) {
  "AMD64" { $Asset = "xdocs-windows-amd64.exe" }
  "ARM64" { $Asset = "xdocs-windows-arm64.exe" }
  default { throw "Unsupported Windows architecture: $Architecture" }
}

if ($Version -eq "latest") {
  Write-Host "Resolving latest stable XDocs release..."
  $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repository/releases/latest"
  $Tag = [string]$Release.tag_name
  if ($Tag -notmatch "^xdocs/v(.+)$") {
    throw "Latest release does not use the XDocs Go tag format: $Tag"
  }
  $Version = $Matches[1]
} else {
  $Version = $Version.TrimStart("v")
  $Tag = "xdocs/v$Version"
}

$TagUrl = [Uri]::EscapeDataString($Tag)
$BaseUrl = "https://github.com/$Owner/$Repository/releases/download/$TagUrl"
$SkillAsset = "guiho-s-xdocs.zip"
$InstructionAsset = "guiho-i-xdocs.md"
$TempDir = Join-Path ([IO.Path]::GetTempPath()) ("xdocs-" + [guid]::NewGuid().ToString("N"))
$Destination = Join-Path $InstallDir "xdocs.exe"
$Candidate = Join-Path $InstallDir (".xdocs-new-" + [guid]::NewGuid().ToString("N") + ".exe")
$BinaryBackup = Join-Path $InstallDir (".xdocs-backup-" + [guid]::NewGuid().ToString("N") + ".exe")
$BinarySwapped = $false
$Success = $false
$SkillStages = @()
$HadDisableUpdateCheck = Test-Path Env:XDOCS_DISABLE_UPDATE_CHECK
$PriorDisableUpdateCheck = $env:XDOCS_DISABLE_UPDATE_CHECK
New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
  Write-Host "Initiating GUIHO CLI Upgrade / Installation Sequence..."
  Write-Host "Target Version: $Tag"
  Write-Host "Architecture:   $Architecture"
  Write-Host "Target Asset:   $Asset"
  Write-Host "Source URL:     $BaseUrl/$Asset"

  foreach ($Item in @($Asset, "checksums.txt", $SkillAsset, $InstructionAsset)) {
    Invoke-WebRequest -Uri "$BaseUrl/$Item" -OutFile (Join-Path $TempDir $Item)
  }

  $ChecksumsPath = Join-Path $TempDir "checksums.txt"
  function Test-XDocsChecksum([string]$Name) {
    $Line = Get-Content -LiteralPath $ChecksumsPath |
      Where-Object { $_ -match "\s+$([regex]::Escape($Name))$" } |
      Select-Object -First 1
    if (-not $Line) {
      throw "Checksum entry missing for $Name."
    }
    $Expected = ($Line -split "\s+")[0].ToUpperInvariant()
    $Actual = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $TempDir $Name)).Hash.ToUpperInvariant()
    if ($Expected -ne $Actual) {
      throw "Checksum verification failed for $Name."
    }
  }
  Test-XDocsChecksum $Asset
  Test-XDocsChecksum $SkillAsset
  Test-XDocsChecksum $InstructionAsset
  Write-Host "[OK] SHA-256 verification complete for binary and agent assets."

  $BinaryPath = Join-Path $TempDir $Asset
  $env:XDOCS_DISABLE_UPDATE_CHECK = "1"
  $Preflight = (& $BinaryPath --version | Out-String).Trim()
  if ($Preflight -ne "xdocs v$Version") {
    throw "Candidate version mismatch: $Preflight"
  }

  $Expanded = Join-Path $TempDir "skill"
  Expand-Archive -LiteralPath (Join-Path $TempDir $SkillAsset) -DestinationPath $Expanded
  $Source = Join-Path $Expanded "guiho-s-xdocs"
  if (-not (Test-Path -LiteralPath (Join-Path $Source "SKILL.md"))) {
    throw "Skill archive does not contain guiho-s-xdocs/SKILL.md."
  }
  $SkillVersions = @(
    Get-Content -LiteralPath (Join-Path $Source "SKILL.md") |
      ForEach-Object {
        if ($_ -match '^\s*version:\s*"?([^"\s]+)"?\s*$') {
          $Matches[1]
        }
      }
  )
  if ($SkillVersions.Count -ne 2 -or @($SkillVersions | Where-Object { $_ -ne $Version }).Count -ne 0) {
    throw "Skill metadata does not match xdocs v$Version."
  }

  foreach ($Root in @("$HOME\.agents\skills", "$HOME\.claude\skills")) {
    New-Item -ItemType Directory -Force -Path $Root | Out-Null
    $Target = Join-Path $Root "guiho-s-xdocs"
    $Stage = [pscustomobject]@{
      Target = $Target
      New = "$Target.new-$([guid]::NewGuid().ToString('N'))"
      Backup = "$Target.backup-$([guid]::NewGuid().ToString('N'))"
      HadOld = Test-Path -LiteralPath $Target
      Swapped = $false
    }
    Copy-Item -Recurse -LiteralPath $Source -Destination $Stage.New
    $SkillStages += $Stage
  }

  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  Copy-Item -LiteralPath $BinaryPath -Destination $Candidate
  if (Test-Path -LiteralPath $Destination) {
    Move-Item -LiteralPath $Destination -Destination $BinaryBackup
  }
  Move-Item -LiteralPath $Candidate -Destination $Destination
  $BinarySwapped = $true

  foreach ($Stage in $SkillStages) {
    if ($Stage.HadOld) {
      Move-Item -LiteralPath $Stage.Target -Destination $Stage.Backup
    }
    Move-Item -LiteralPath $Stage.New -Destination $Stage.Target
    $Stage.Swapped = $true
  }

  & $Destination agent instruction update
  $FinalVersion = (& $Destination --version | Out-String).Trim()
  if ($FinalVersion -ne "xdocs v$Version") {
    throw "Final version mismatch: $FinalVersion"
  }

  if ($env:XDOCS_SKIP_PATH_UPDATE -ne "1") {
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $Entries = @($UserPath -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($Entries -notcontains $InstallDir) {
      [Environment]::SetEnvironmentVariable("Path", (($Entries + $InstallDir) -join ";"), "User")
      Write-Host "[OK] Added installation directory to the user PATH."
    }
  }
  if (($env:Path -split ";") -notcontains $InstallDir) {
    $env:Path = "$InstallDir;$env:Path"
  }

  $Success = $true
  Write-Host "[OK] Installed binary: $Destination"
  foreach ($Stage in $SkillStages) {
    Write-Host "[OK] Installed skill: $($Stage.Target)\SKILL.md"
  }
  Write-Host "[OK] Installed and verified XDocs $Version at $Destination"
} catch {
  foreach ($Stage in $SkillStages) {
    if (Test-Path -LiteralPath $Stage.Backup) {
      if (Test-Path -LiteralPath $Stage.Target) {
        Remove-Item -Recurse -Force -LiteralPath $Stage.Target
      }
      Move-Item -LiteralPath $Stage.Backup -Destination $Stage.Target
    } elseif ($Stage.Swapped -and (Test-Path -LiteralPath $Stage.Target)) {
      Remove-Item -Recurse -Force -LiteralPath $Stage.Target
    }
  }
  if (Test-Path -LiteralPath $BinaryBackup) {
    if (Test-Path -LiteralPath $Destination) {
      Remove-Item -Force -LiteralPath $Destination
    }
    Move-Item -LiteralPath $BinaryBackup -Destination $Destination
  } elseif ($BinarySwapped -and (Test-Path -LiteralPath $Destination)) {
    Remove-Item -Force -LiteralPath $Destination
  }
  throw
} finally {
  if (Test-Path -LiteralPath $TempDir) {
    Remove-Item -Recurse -Force -LiteralPath $TempDir
  }
  if (Test-Path -LiteralPath $Candidate) {
    Remove-Item -Force -LiteralPath $Candidate
  }
  foreach ($Stage in $SkillStages) {
    if (Test-Path -LiteralPath $Stage.New) {
      Remove-Item -Recurse -Force -LiteralPath $Stage.New
    }
    if ($Success -and (Test-Path -LiteralPath $Stage.Backup)) {
      Remove-Item -Recurse -Force -LiteralPath $Stage.Backup
    }
  }
  if ($Success -and (Test-Path -LiteralPath $BinaryBackup)) {
    Remove-Item -Force -LiteralPath $BinaryBackup
  }
  if ($HadDisableUpdateCheck) {
    $env:XDOCS_DISABLE_UPDATE_CHECK = $PriorDisableUpdateCheck
  } else {
    Remove-Item Env:XDOCS_DISABLE_UPDATE_CHECK -ErrorAction SilentlyContinue
  }
}
