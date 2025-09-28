@echo off
title NGO Billing App Setup and Launcher
color 0a

echo ============================================
echo    NGO Billing Application Setup
echo ============================================
echo.

@echo off
title NGO Billing App Setup and Launcher
color 0a

echo ============================================
echo    NGO Billing Application Setup
echo ============================================
echo.

:: Check if required files exist
echo [1/7] Checking for required application files...
if not exist "backend" goto :download_files
if not exist "frontend" goto :download_files
if not exist "package.json" goto :download_files
echo Application files found!
goto :check_node

:download_files
echo Application files not found. Downloading from repository...
echo.

:: Check if Git is installed
echo [2/7] Checking Git installation...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed or not in PATH.
    echo.
    echo Downloading and installing Git...

    :: Download Git installer
    if not exist "git-installer.exe" (
        echo Downloading Git installer...
        powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe' -OutFile 'git-installer.exe'}"
    )

    :: Install Git silently
    echo Installing Git...
    start /wait git-installer.exe /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"

    :: Wait for installation to complete
    timeout /t 15 /nobreak >nul

    :: Refresh environment variables
    call RefreshEnv.cmd 2>nul || (
        echo Please restart this script after Git installation completes.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )

    :: Verify installation
    git --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Git installation may not be complete.
        echo Please restart your computer and run this script again.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )

    :: Clean up installer
    del git-installer.exe 2>nul
)

echo Git is installed:
git --version
echo.

:: Clone repository
echo Downloading application files...
if exist "temp-repo" rmdir /s /q "temp-repo"
git clone https://github.com/ShayantanBose/Billing-App.git temp-repo
if %errorlevel% neq 0 (
    echo Failed to download application files.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

:: Copy files to current directory (excluding .git)
echo Copying application files...
for /d %%i in (temp-repo\*) do (
    if not "%%~ni"==".git" (
        if not exist "%%~ni" (
            echo Copying %%~ni...
            xcopy /s /e /i "%%i" "%%~ni"
        )
    )
)

for %%i in (temp-repo\*) do (
    if not "%%~xi"=="" (
        if not exist "%%~ni%%~xi" (
            echo Copying %%~ni%%~xi...
            copy "%%i" "%%~ni%%~xi"
        )
    )
)

:: Clean up temp directory
rmdir /s /q "temp-repo"
echo Application files downloaded successfully!
echo.

:check_node
:: Check if Node.js is installed
echo [3/7] Checking Node.js installation...
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
echo [4/7] Checking npm dependencies...
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

echo [5/7] Building frontend application...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed. Please check the error messages above.
    cd ..
    pause
    exit /b 1
)
cd ..

echo [6/7] Copying built frontend to backend...
if exist "backend/public" rmdir /s /q "backend/public"
xcopy /s /e /i "frontend/dist" "backend/public"

:: Update backend to serve frontend
echo [7/7] Configuring backend to serve frontend...

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
