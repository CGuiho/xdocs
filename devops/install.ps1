param(
  [string]$Version,
  [string]$Arch,
  [string]$Variant,
  [string]$InstallDir,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# === Defaults from env vars or sensible defaults ===
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = if ($env:XDOCS_VERSION) { $env:XDOCS_VERSION } else { 'latest' }
}
$Repo = if ($env:XDOCS_REPO) { $env:XDOCS_REPO } else { 'CGuiho/xdocs' }
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
  $InstallDir = if ($env:XDOCS_INSTALL_DIR) { $env:XDOCS_INSTALL_DIR } else { Join-Path $HOME '.local\bin' }
}

# === Show help ===
if ($Help -or $Version -eq '--help' -or $Version -eq '-h') {
  @"
Install GUIHO XDocs as a native CLI binary from GitHub Releases.

Usage: install.ps1 [-Version VERSION] [-Arch ARCH] [-Variant VARIANT] [-InstallDir DIR]

Parameters:
  -Version      Version to install (default: latest).
                Examples: latest, 0.4.7, @guiho/xdocs@0.4.7
  -Arch         Force architecture: x64 | arm64 (default: auto-detect)
  -Variant      Force x64 variant: baseline | default | modern (default: baseline)
  -InstallDir   Install directory (default: `$HOME\.local\bin)
  -Help         Show this help

Environment variables:
  XDOCS_VERSION, XDOCS_REPO, XDOCS_INSTALL_DIR
"@
  return
}

# === Detect architecture (compatible with PowerShell 5.1+) ===
$detectedArch = if ($Arch) {
  $Arch
} else {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { 'x64' }
    'ARM64' { 'arm64' }
    default { throw "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE. Must be AMD64 or ARM64." }
  }
}

if ($detectedArch -notin @('x64', 'arm64')) {
  throw "Invalid architecture: $detectedArch. Must be x64 or arm64."
}

if (-not [Environment]::Is64BitOperatingSystem) {
  throw 'Unsupported platform: Windows 32-bit is not supported.'
}

# === Build asset candidates (baseline-first for x64) ===
$variant = if ($Variant) { $Variant } else { 'baseline' }

$assetCandidates = if ($detectedArch -eq 'x64') {
  switch ($variant) {
    'baseline' { @(
      "xdocs-windows-x64-baseline.exe",
      "xdocs-windows-x64.exe",
      "xdocs-windows-x64-modern.exe"
    )}
    'default' { @(
      "xdocs-windows-x64.exe",
      "xdocs-windows-x64-baseline.exe",
      "xdocs-windows-x64-modern.exe"
    )}
    'modern' { @(
      "xdocs-windows-x64-modern.exe",
      "xdocs-windows-x64.exe",
      "xdocs-windows-x64-baseline.exe"
    )}
    default { throw "Invalid variant: $variant. Must be baseline, default, or modern." }
  }
} else {
  if ($Variant) {
    throw '-Variant is only valid for x64 installs.'
  }
  @("xdocs-windows-arm64.exe")
}

# === Build download URL ===
function Get-DownloadUrl {
  param([string]$Asset)

  if ($env:XDOCS_DOWNLOAD_BASE_URL) {
    return "$($env:XDOCS_DOWNLOAD_BASE_URL.TrimEnd('/'))/$Asset"
  }

  if ($Version -eq 'latest') {
    return "https://github.com/$Repo/releases/latest/download/$Asset"
  }

  $tag = if ($Version.StartsWith('@guiho/xdocs@')) { $Version }
         elseif ($Version.StartsWith('@')) { $Version }
         else { "@guiho/xdocs@$Version" }

  $encodedTag = [Uri]::EscapeDataString($tag)
  return "https://github.com/$Repo/releases/download/$encodedTag/$Asset"
}

function Get-PathEntries {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return @()
  }

  return @($PathValue -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Test-PathContains {
  param(
    [string]$PathValue,
    [string]$Directory
  )

  $normalizedDirectory = $Directory.TrimEnd('\')
  foreach ($entry in Get-PathEntries -PathValue $PathValue) {
    if ($entry.TrimEnd('\').Equals($normalizedDirectory, [StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  return $false
}

function Add-InstallDirToPath {
  param([string]$Directory)

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (Test-PathContains -PathValue $userPath -Directory $Directory)) {
    $entries = @(Get-PathEntries -PathValue $userPath)
    $newUserPath = (@($Directory) + $entries) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $newUserPath.TrimEnd(';'), 'User')
    Write-Host "Added $Directory to user PATH. Restart your terminal to use xdocs globally."
  } else {
    Write-Host "$Directory is already configured in user PATH."
  }

  if (-not (Test-PathContains -PathValue $env:Path -Directory $Directory)) {
    $env:Path = "$Directory;$env:Path"
  }
}

function Test-NativeBinary {
  param([string]$Path)

  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -lt 2) {
    return $false
  }

  return $bytes[0] -eq 0x4D -and $bytes[1] -eq 0x5A
}

function Get-NormalizedVersion {
  param([string]$Value)
  return $Value.Replace('@guiho/xdocs@', '').TrimStart('v')
}

function Get-ExecutableVersion {
  param([string]$Path)

  $previousDisableUpdateCheck = $env:XDOCS_DISABLE_UPDATE_CHECK
  $process = $null
  try {
    $env:XDOCS_DISABLE_UPDATE_CHECK = '1'
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $Path
    $startInfo.Arguments = '--version'
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
      throw "Could not launch $Path --version."
    }
    if (-not $process.WaitForExit(15000)) {
      $process.Kill()
      $process.WaitForExit()
      throw "Executable verification timed out for $Path after 15 seconds."
    }
    $output = $process.StandardOutput.ReadToEnd().Trim()
    $errorOutput = $process.StandardError.ReadToEnd().Trim()
    if ($process.ExitCode -ne 0) {
      throw "Executable verification failed for $Path with exit code $($process.ExitCode)`: $errorOutput"
    }
  } finally {
    if ($null -ne $process) {
      $process.Dispose()
    }
    if ($null -eq $previousDisableUpdateCheck) {
      Remove-Item Env:XDOCS_DISABLE_UPDATE_CHECK -ErrorAction SilentlyContinue
    } else {
      $env:XDOCS_DISABLE_UPDATE_CHECK = $previousDisableUpdateCheck
    }
  }
  if ($output -notmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$') {
    throw "Executable verification did not return exactly one semantic version for $Path`: $output"
  }
  return $output
}

function Test-Shadowing {
  param([string]$ExpectedPath)

  $command = Get-Command xdocs -ErrorAction SilentlyContinue
  if (-not $command) {
    return
  }

  if (-not $command.Source.Equals($ExpectedPath, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Warning "Another xdocs appears earlier in PATH: $($command.Source)"
    Write-Warning "The newly installed binary is at: $ExpectedPath"
  }
}

# === Main ===
$variantLabel = if ($Variant) { " variant=$Variant" } else { "" }
Write-Host "xdocs: $Version  os=windows  arch=$detectedArch$variantLabel"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$InstallDir = (Resolve-Path -LiteralPath $InstallDir).Path
$destination = Join-Path $InstallDir 'xdocs.exe'
$transactionId = "$PID-$([Guid]::NewGuid().ToString('N'))"
$temporaryFile = Join-Path $InstallDir ".xdocs-install-$transactionId.exe"
$backupFile = Join-Path $InstallDir ".xdocs-backup-$transactionId.exe"

foreach ($asset in $assetCandidates) {
  $url = Get-DownloadUrl -Asset $asset
  Write-Host "  Trying $url"
  try {
    Invoke-WebRequest -Uri $url -OutFile $temporaryFile -UseBasicParsing -ErrorAction Stop
    Unblock-File -LiteralPath $temporaryFile -ErrorAction SilentlyContinue
    if (-not (Test-NativeBinary -Path $temporaryFile)) {
      Write-Host "  $asset was not a native Windows binary, trying next..."
      Remove-Item -LiteralPath $temporaryFile -Force -ErrorAction SilentlyContinue
      continue
    }

    $candidateVersion = Get-ExecutableVersion -Path $temporaryFile
    if ($Version -ne 'latest' -and $candidateVersion -ne (Get-NormalizedVersion -Value $Version)) {
      throw "Downloaded $asset reports $candidateVersion, expected $(Get-NormalizedVersion -Value $Version)."
    }

    $backupCreated = $false
    try {
      if (Test-Path -LiteralPath $destination) {
        Move-Item -LiteralPath $destination -Destination $backupFile -Force
        $backupCreated = $true
      }
      Move-Item -LiteralPath $temporaryFile -Destination $destination -Force
      $installedVersion = Get-ExecutableVersion -Path $destination
      if ($installedVersion -ne $candidateVersion) {
        throw "Installed xdocs reports $installedVersion, expected $candidateVersion."
      }
      Remove-Item -LiteralPath $backupFile -Force -ErrorAction SilentlyContinue
    } catch {
      $installationError = $_.Exception.Message
      Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
      if ($backupCreated -and (Test-Path -LiteralPath $backupFile)) {
        try {
          Move-Item -LiteralPath $backupFile -Destination $destination -Force
        } catch {
          throw "Installation failed: $installationError Rollback also failed: $($_.Exception.Message). Preserved backup: $backupFile"
        }
      }
      throw $installationError
    }
    Write-Host "Installed xdocs to $destination"

    if ($env:XDOCS_SKIP_PATH_UPDATE -ne '1') {
      Add-InstallDirToPath -Directory $InstallDir
      Test-Shadowing -ExpectedPath $destination
    }

    if (Test-Path -LiteralPath $temporaryFile) {
      Remove-Item -LiteralPath $temporaryFile -Force
    }

    Write-Host "Verified: $destination --version -> $installedVersion"
    return
  } catch {
    Remove-Item -LiteralPath $temporaryFile -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $backupFile) {
      throw "xdocs installation stopped because rollback could not safely complete. Preserved backup: $backupFile. Error: $($_.Exception.Message)"
    }
    Write-Host "  failed: $($_.Exception.Message)"
    Write-Host "  trying next candidate..."
  }
}

if (Test-Path -LiteralPath $temporaryFile) {
  Remove-Item -LiteralPath $temporaryFile -Force
}
if (Test-Path -LiteralPath $backupFile) {
  if (-not (Test-Path -LiteralPath $destination)) {
    Move-Item -LiteralPath $backupFile -Destination $destination -Force
  } else {
    throw "xdocs installation could not determine a safe canonical executable. Preserved both destination and backup: $backupFile"
  }
}

throw "No compatible xdocs binary found. Check available assets at: https://github.com/$Repo/releases"
