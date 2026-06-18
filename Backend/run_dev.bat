@echo off
echo Starting SentinelAI Dev Environment...
echo.

:: Start Mailpit (SMTP capture + Web UI at http://localhost:8025)
start "Mailpit" /B mailpit\mailpit.exe --smtp-bind-addr 127.0.0.1:1025 --http-bind-addr 127.0.0.1:8025

:: Give Mailpit a moment to start
timeout /t 2 /nobreak >nul

:: Start the backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

:: Cleanup Mailpit when backend stops
taskkill /f /im mailpit.exe >nul 2>&1
echo Backend stopped.
