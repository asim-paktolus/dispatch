param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("scorm12", "scorm2004")]
  [string]$Target
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here "..")
$out = Join-Path $root "dist"

New-Item -ItemType Directory -Force -Path $out | Out-Null

$staging = Join-Path $out ("staging-" + $Target)
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Copy-Item -Recurse -Force (Join-Path $root "js") (Join-Path $staging "js")
Copy-Item -Force (Join-Path $root "index.html") (Join-Path $staging "index.html")

if ($Target -eq "scorm12") {
  Copy-Item -Force (Join-Path $root "manifests/imsmanifest.scorm12.xml") (Join-Path $staging "imsmanifest.xml")
  $zip = Join-Path $out "scorm-dispatch-unified-scorm12.zip"
} else {
  Copy-Item -Force (Join-Path $root "manifests/imsmanifest.scorm2004.xml") (Join-Path $staging "imsmanifest.xml")
  $zip = Join-Path $out "scorm-dispatch-unified-scorm2004.zip"
}

if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zip -Force

Write-Host "Built: $zip"

