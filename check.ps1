param(
  [ValidateSet("backend","frontend","all")] [string]$target = "all",
  [switch]$full   # thêm -full để chạy cả audit, docker, semgrep
)

function Run($label, $cmd) {
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  Invoke-Expression $cmd
  if ($LASTEXITCODE -ne 0) { Write-Host "THẤT BẠI: $label" -ForegroundColor Red; exit 1 }
}

$apps = @()
if ($target -in "backend","all")  { $apps += "edulms-backend" }
if ($target -in "frontend","all") { $apps += "edulms-frontend" }

foreach ($app in $apps) {
  Push-Location $app
  Run "$app / build" "npm run build"
  Run "$app / lint"  "npm run lint"
  Run "$app / test"  "npm run test:ci"
  if ($full) { Run "$app / audit" "npm audit --omit=dev --audit-level=high" }
  Pop-Location
}

if ($full) {
  Run "semgrep" "docker run --rm -v `"${PWD}:/src`" -w /src semgrep/semgrep semgrep scan --config p/default --config p/nodejs --config p/react --severity ERROR --error --metrics=off ."
  foreach ($app in $apps) { Run "$app / docker" "docker build -t $app`:test ./$app" }
}

Write-Host "`nTat ca deu xanh, co the push." -ForegroundColor Green

# .\check.ps1                       # nhanh: build + lint + test cho cả hai
# .\check.ps1 -target frontend      # chỉ frontend
# .\check.ps1 -target backend -full # đầy đủ cho backend (audit, semgrep, docker)
# .\check.ps1 -full                 # đầy đủ như CI, chạy trước khi mở PR