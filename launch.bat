@echo off
:: Simple launcher for NGO Billing App
cd /d "%~dp0"

:: Check if this is first run or if required files are missing
if not exist "backend" goto :first_run
if not exist "frontend" goto :first_run
if not exist "package.json" goto :first_run
if not exist "backend\public" goto :first_run

:: Quick start for already-setup installation
echo Starting NGO Billing Application...
echo.
echo Open your browser to: http://localhost:3001
echo Press Ctrl+C to stop the application
echo.
cd backend
node index.js
goto :end

:first_run
echo First time setup detected...
echo This will download any missing files and set up the application.
echo.
call start-app.bat

:end