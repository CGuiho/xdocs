$ErrorActionPreference = 'Stop'

$Repo = 'CGuiho/xdocs'
$InstallDir = if ($env:XDOCS_INSTALL_DIR) { $env:XDOCS_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\xdocs\bin' }
$Tag = if ($env:XDOCS_VERSION) { $env:XDOCS_VERSION } else { 'latest' }

if (-not [Environment]::Is64BitOperatingSystem) {
  throw 'Unsupported platform: Windows 32-bit is not supported.'
}

if ($env:PROCESSOR_ARCHITECTURE -notin @('AMD64', 'ARM64')) {
  throw "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE"
}

# x64 has three variants: baseline → default → modern (try in that order)
$archSuffix = if ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64') { 'x64' } else { 'arm64' }
if ($archSuffix -eq 'x64') {
  $Candidates = @(
    "xdocs-windows-x64-baseline.exe",
    "xdocs-windows-x64.exe",
    "xdocs-windows-x64-modern.exe"
  )
} else {
  $Candidates = @("xdocs-windows-arm64.exe")
}

function Get-DownloadUrl {
  param([string]$Asset)
  if ($Tag -eq 'latest') {
    return "https://github.com/$Repo/releases/latest/download/$Asset"
  }
  $ReleaseTag = if ($Tag.StartsWith('@guiho/xdocs@')) { $Tag } else { "@guiho/xdocs@$Tag" }
  $EncodedTag = [Uri]::EscapeDataString($ReleaseTag)
  return "https://github.com/$Repo/releases/download/$EncodedTag/$Asset"
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$Target = Join-Path $InstallDir 'xdocs.exe'

foreach ($Asset in $Candidates) {
  $Url = Get-DownloadUrl -Asset $Asset
  try {
    Write-Host "Trying $Url"
    Invoke-WebRequest -Uri $Url -OutFile $Target -ErrorAction Stop
    Write-Host "Installed xdocs to $Target"
    $UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (($UserPath -split ';') -notcontains $InstallDir) {
      [Environment]::SetEnvironmentVariable('Path', "$UserPath;$InstallDir", 'User')
      Write-Host "Added $InstallDir to the user PATH. Restart your terminal to use xdocs globally."
    }
    Write-Host 'Run: xdocs --version'
    exit 0
  } catch {
    Write-Host "  $Asset not available, trying next..."
  }
}

throw "No compatible xdocs binary found. Download manually from https://github.com/$Repo/releases"
