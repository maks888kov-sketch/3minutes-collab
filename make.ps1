# One-command runner for the 3Minutes self-hosted stack (Windows, no GNU make needed).
#   .\make.ps1            -> build & run everything
#   .\make.ps1 <target>   -> up | build | start | down | restart | backend | frontend |
#                            logs | ps | migrate | reset-db | clean | smoke | e2e | help
param([string]$target = "up")

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Compose { docker compose -f selfhost/docker-compose.yml @args }

switch ($target) {
  "help" {
    Write-Host "3Minutes - targets (.\make.ps1 <target>):"
    Write-Host "  up         build images and start the whole stack"
    Write-Host "  build      build images only"
    Write-Host "  start      start without rebuilding"
    Write-Host "  down       stop containers"
    Write-Host "  restart    restart containers"
    Write-Host "  backend    rebuild and restart only the backend"
    Write-Host "  frontend   rebuild and restart only the frontend"
    Write-Host "  logs       follow logs of all services"
    Write-Host "  ps         container status"
    Write-Host "  migrate    run DB migrations manually"
    Write-Host "  reset-db   truncate data (keeps services running)"
    Write-Host "  clean      stop and remove volumes (wipe all data)"
    Write-Host "  smoke      API smoke test"
    Write-Host "  e2e        E2E in Yandex Browser (auth / chat / video)"
    Write-Host ""
    Write-Host "App: http://localhost:5180   Mail (codes): http://localhost:8026"
  }
  "up" {
    Compose up -d --build
    Write-Host ""
    Write-Host "Done. App: http://localhost:5180   Mail (codes): http://localhost:8026"
  }
  "build"    { Compose build }
  "start"    { Compose up -d }
  "down"     { Compose down }
  "restart"  { Compose restart }
  "backend"  { Compose up -d --build backend }
  "frontend" { Compose up -d --build frontend }
  "logs"     { Compose logs -f }
  "ps"       { Compose ps }
  "migrate"  { Compose exec backend alembic upgrade head }
  "reset-db" { Compose exec postgres psql -U threemin -d threemin -c "TRUNCATE profiles, matches, messages, likes, users, otp_codes, feedback CASCADE;" }
  "clean"    { Compose down -v }
  "smoke"    { Set-Location selfhost/e2e; npm install --silent; node smoke.mjs }
  "e2e"      { Set-Location selfhost/e2e; npm install --silent; node run.mjs }
  default {
    Write-Host "Unknown target: $target"
    Write-Host "Targets: up build start down restart backend frontend logs ps migrate reset-db clean smoke e2e help"
    exit 1
  }
}
