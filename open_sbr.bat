@echo off
setlocal
cd /d "%~dp0"
echo Finding SBR Cloudflare URL...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$m = (docker compose logs tunnel 2>&1 | Select-String 'https://\S+trycloudflare\.com').Matches.Value; if ($m) { $url = $m[-1]; Write-Host \"`n===================================================\"; Write-Host \"  Cloudflare URL: $url\" -ForegroundColor Green; Write-Host \"===================================================`n\"; Start-Process $url } else { Write-Host \"[!] Cloudflare Tunnel URL not found.\" -ForegroundColor Red; pause }"
