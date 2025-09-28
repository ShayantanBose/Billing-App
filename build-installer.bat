@echo off
echo Building NGO Billing App Installer...
echo.

:: Check if NSIS is installed
where makensis >nul 2>&1
if %errorlevel% neq 0 (
    echo NSIS not found in PATH.
    echo Please install NSIS from https://nsis.sourceforge.io/
    echo After installation, add NSIS to your system PATH or run this script from the NSIS directory.
    pause
    exit /b 1
)

:: Build the installer
echo Compiling installer...
makensis installer.nsi

if %errorlevel% equ 0 (
    echo.
    echo Installer built successfully!
    echo File: NGO Billing App-Setup.exe
    echo.
    echo You can now distribute this installer to users.
) else (
    echo.
    echo Installer build failed!
    echo Please check the error messages above.
)

pause