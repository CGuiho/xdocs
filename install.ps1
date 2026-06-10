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

if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
  throw 'Windows arm64 release assets are not published yet. Install Bun and run @guiho/xdocs from source, or use Windows x64 emulation if available.'
}

$Asset = 'xdocs-windows-x64.exe'
$Url = if ($Tag -eq 'latest') {
  "https://github.com/$Repo/releases/latest/download/$Asset"
} else {
  $ReleaseTag = if ($Tag.StartsWith('@guiho/xdocs@')) { $Tag } else { "@guiho/xdocs@$Tag" }
  $EncodedTag = [Uri]::EscapeDataString($ReleaseTag)
  "https://github.com/$Repo/releases/download/$EncodedTag/$Asset"
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$Target = Join-Path $InstallDir 'xdocs.exe'

Write-Host "Downloading $Url"
Invoke-WebRequest -Uri $Url -OutFile $Target

$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($UserPath -split ';') -notcontains $InstallDir) {
  [Environment]::SetEnvironmentVariable('Path', "$UserPath;$InstallDir", 'User')
  Write-Host "Added $InstallDir to the user PATH. Restart your terminal to use xdocs globally."
}

Write-Host "Installed xdocs to $Target"
Write-Host 'Run: xdocs --version'
