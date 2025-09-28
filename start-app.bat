@echo off
title NGO Billing App Setup and Launcher
color 0a

echo ============================================
echo    NGO Billing Application Setup
echo ============================================
echo.

:: Check if Node.js is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo.
    echo Downloading and installing Node.js...
    
    :: Download Node.js installer
    if not exist "nodejs-installer.msi" (
        echo Downloading Node.js installer...
        powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'nodejs-installer.msi'}"
    )
    
    :: Install Node.js silently
    echo Installing Node.js...
    msiexec /i nodejs-installer.msi /quiet /qn /norestart
    
    :: Wait for installation to complete
    timeout /t 30 /nobreak >nul
    
    :: Refresh environment variables
    call RefreshEnv.cmd 2>nul || (
        echo Please restart this script after Node.js installation completes.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    
    :: Verify installation
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Node.js installation may not be complete.
        echo Please restart your computer and run this script again.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

echo Node.js is installed: 
node --version
npm --version
echo.

:: Check if npm packages are installed
echo [2/5] Checking npm dependencies...
if not exist "node_modules" (
    echo Installing main dependencies...
    call npm install
)

if not exist "backend/node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend/node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo [3/5] Building frontend application...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed. Please check the error messages above.
    cd ..
    pause
    exit /b 1
)
cd ..

echo [4/5] Copying built frontend to backend...
if exist "backend/public" rmdir /s /q "backend/public"
xcopy /s /e /i "frontend/dist" "backend/public"

:: Update backend to serve frontend
echo [5/5] Configuring backend to serve frontend...

echo.
echo ============================================
echo    Starting NGO Billing Application
echo ============================================
echo.
echo The application will start in a few seconds...
echo Backend will run on: http://localhost:3001
echo Frontend will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the application
echo.

:: Start the backend server which now serves the frontend
cd backend
node index.js

pause