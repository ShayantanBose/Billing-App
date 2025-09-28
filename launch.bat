@echo off
:: Simple launcher for NGO Billing App
cd /d "%~dp0"

:: Check if this is first run
if not exist "backend\public" (
    echo First time setup detected...
    call start-app.bat
) else (
    echo Starting NGO Billing Application...
    echo.
    echo Open your browser to: http://localhost:3001
    echo Press Ctrl+C to stop the application
    echo.
    cd backend
    node index.js
)