@echo off
REM ===== Sync: Custom WEB UI ← Unified Dashboard =====
REM This keeps the custom web UI in sync with the unified dashboard.html
copy /Y "%USERPROFILE%\.hermes\dashboard.html" "%~dp0index.html"
echo [OK] Custom UI synced with unified dashboard at %DATE% %TIME%
