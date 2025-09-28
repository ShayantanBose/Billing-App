@echo off
:: NGO Billing Application Standalone Installer
:: This script can be downloaded independently and will set up everything automatically
:: Usage: Download this file and double-click to run

title NGO Billing App Installer
color 0a

set "INSTALL_PATH=%USERPROFILE%\NGO-Billing-App"
set "REPO_URL=https://github.com/ShayantanBose/Billing-App.git"

echo ============================================
echo    NGO Billing Application Installer
echo ============================================
echo.
echo Install Path: %INSTALL_PATH%
echo.

:: Create install directory
if not exist "%INSTALL_PATH%" mkdir "%INSTALL_PATH%"

:: Check if Git is installed
echo [1/7] Checking Git installation...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed. Installing...
    echo.

    :: Download Git installer
    if not exist "%TEMP%\git-installer.exe" (
        echo Downloading Git installer...
        powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'}"
    )

    :: Install Git silently
    echo Installing Git...
    start /wait "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"

    :: Wait for installation to complete
    timeout /t 15 /nobreak >nul

    :: Verify installation
    git --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Git installation failed.
        echo Please install Git manually from https://git-scm.com/
        pause
        exit /b 1
    )

    :: Clean up installer
    del "%TEMP%\git-installer.exe" 2>nul
)

echo Git is installed:
git --version
echo.

:: Check if Node.js is installed
echo [2/7] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Installing...
    echo.

    :: Download Node.js installer
    if not exist "%TEMP%\nodejs-installer.msi" (
        echo Downloading Node.js installer...
        powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\nodejs-installer.msi'}"
    )

    :: Install Node.js silently
    echo Installing Node.js...
    msiexec /i "%TEMP%\nodejs-installer.msi" /quiet /qn /norestart

    :: Wait for installation to complete
    timeout /t 30 /nobreak >nul

    :: Verify installation
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Node.js installation may not be complete.
        echo Please install Node.js manually from https://nodejs.org/
        pause
        exit /b 1
    )

    :: Clean up installer
    del "%TEMP%\nodejs-installer.msi" 2>nul
)

echo Node.js is installed:
node --version
npm --version
echo.

:: Verify installations
echo [3/7] Verifying installations...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not properly installed.
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not properly installed.
    pause
    exit /b 1
)

:: Download application files
echo [4/7] Downloading application files...
cd /d "%INSTALL_PATH%"
if exist ".git" (
    echo Updating existing installation...
    git pull
) else (
    echo Cloning repository...
    git clone %REPO_URL% .
)

if %errorlevel% neq 0 (
    echo Failed to download application files.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo Application files downloaded successfully!
echo.

:: Install dependencies
echo [5/7] Installing dependencies...

echo Installing main dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install main dependencies.
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies.
    cd ..
    pause
    exit /b 1
)
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies.
    cd ..
    pause
    exit /b 1
)
cd ..

:: Build application
echo [6/7] Building application...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed.
    cd ..
    pause
    exit /b 1
)
cd ..

echo Copying built frontend to backend...
if exist "backend\public" rmdir /s /q "backend\public"
xcopy /s /e /i "frontend\dist" "backend\public"

:: Create shortcuts
echo [7/7] Creating shortcuts...

:: Create desktop shortcut
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\create_shortcut.vbs"
echo Set Shortcut = WshShell.CreateShortcut("%USERPROFILE%\Desktop\NGO Billing App.lnk") >> "%TEMP%\create_shortcut.vbs"
echo Shortcut.TargetPath = "cmd.exe" >> "%TEMP%\create_shortcut.vbs"
echo Shortcut.Arguments = "/c cd /d ""%INSTALL_PATH%"" && start-app.bat" >> "%TEMP%\create_shortcut.vbs"
echo Shortcut.WorkingDirectory = "%INSTALL_PATH%" >> "%TEMP%\create_shortcut.vbs"
echo Shortcut.Description = "NGO Billing Application" >> "%TEMP%\create_shortcut.vbs"
echo Shortcut.Save >> "%TEMP%\create_shortcut.vbs"

cscript //nologo "%TEMP%\create_shortcut.vbs"
del "%TEMP%\create_shortcut.vbs"

echo.
echo ============================================
echo    Installation Complete!
echo ============================================
echo.
echo The NGO Billing App has been installed successfully!
echo Installation path: %INSTALL_PATH%
echo.
echo You can start the application by:
echo   1. Double-clicking the desktop shortcut
echo   2. Running start-app.bat from the installation folder
echo.

set /p "START_NOW=Would you like to start the application now? (y/n): "
if /i "%START_NOW%"=="y" (
    echo Starting application...
    start-app.bat
) else (
    echo.
    echo Installation complete. You can start the app anytime using the desktop shortcut.
)

pause
