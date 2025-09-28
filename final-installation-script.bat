@echo off
:: ===========================================================================
::                    NGO BILLING APP - FINAL INSTALLATION SCRIPT
:: ===========================================================================
:: This script does EVERYTHING in one place:
:: - Installs Git and Node.js if needed
:: - Downloads the application to the current directory
:: - Installs all dependencies 
:: - Builds the application
:: - Creates shortcuts
:: - Runs the application
:: 
:: USAGE: Just download this file anywhere and double-click to run
:: FUTURE CHANGES: Modify the variables in the CONFIGURATION section below
:: ===========================================================================

setlocal EnableExtensions EnableDelayedExpansion

:: ===========================================================================
::                              CONFIGURATION
:: ===========================================================================
:: Modify these variables for future changes

:: Application Configuration
set "APP_NAME=NGO Billing App"
set "APP_DESCRIPTION=Bill OCR and Expense Tracking Application"
set "REPO_URL=https://github.com/ShayantanBose/Billing-App.git"
set "MAIN_BRANCH=main"

:: Installation URLs (update these for newer versions)
set "GIT_DOWNLOAD_URL=https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe"
set "NODEJS_DOWNLOAD_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"

:: Application Settings
set "SERVER_PORT=3001"
set "FRONTEND_BUILD_CMD=npm run build"
set "BACKEND_START_CMD=node index.js"

:: Directory Structure
set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"
set "BUILD_OUTPUT_DIR=dist"
set "BACKEND_PUBLIC_DIR=backend\public"

:: ===========================================================================
::                            INITIALIZATION
:: ===========================================================================

title %APP_NAME% - Final Installation Script
color 0a

:: Get script directory and set as installation directory
set "INSTALL_DIR=%~dp0"
set "INSTALL_DIR=%INSTALL_DIR:~0,-1%"
cd /d "%INSTALL_DIR%"

echo.
echo ===========================================================================
echo                    %APP_NAME% - FINAL INSTALLER
echo ===========================================================================
echo.
echo Installation Directory: %INSTALL_DIR%
echo Repository: %REPO_URL%
echo.

:: Check if this is a fresh installation or existing setup
if exist "%BACKEND_DIR%" if exist "%FRONTEND_DIR%" if exist "package.json" (
    echo [STATUS] Complete installation detected.
    goto :existing_installation
) else if exist "%BACKEND_DIR%" (
    echo [STATUS] Partial installation detected - missing files.
    goto :repair_installation
) else if exist "%FRONTEND_DIR%" (
    echo [STATUS] Partial installation detected - missing files.
    goto :repair_installation
) else if exist "package.json" (
    echo [STATUS] Partial installation detected - missing directories.
    goto :repair_installation
) else (
    echo [STATUS] Fresh installation required.
    goto :fresh_installation
)

:: ===========================================================================
::                         REPAIR INSTALLATION
:: ===========================================================================
:repair_installation
echo [STATUS] Incomplete installation detected!
echo [STATUS] Some files are missing. This needs to be repaired.
echo.
echo Current directory contents:
dir /b 2>nul
echo.
echo The following files/directories were found:
if exist "%BACKEND_DIR%" echo   - Backend directory: YES
if not exist "%BACKEND_DIR%" echo   - Backend directory: MISSING
if exist "%FRONTEND_DIR%" echo   - Frontend directory: YES  
if not exist "%FRONTEND_DIR%" echo   - Frontend directory: MISSING
if exist "package.json" echo   - Package.json: YES
if not exist "package.json" echo   - Package.json: MISSING
if exist ".git" echo   - Git repository: YES
if not exist ".git" echo   - Git repository: MISSING
echo.
echo Choose repair option:
echo   1. Download missing files (may overwrite existing files)
echo   2. Clean install (delete everything and start fresh)  
echo   3. Move to subfolder and clean install
echo   4. Exit
echo.
set /p "REPAIR_CHOICE=Enter choice (1-4): "

if "!REPAIR_CHOICE!"=="1" goto :repair_download
if "!REPAIR_CHOICE!"=="2" goto :clean_install
if "!REPAIR_CHOICE!"=="3" goto :subfolder_install
if "!REPAIR_CHOICE!"=="4" goto :exit_script

echo Invalid choice. Exiting...
goto :exit_script

:repair_download
echo [INFO] Attempting to repair by downloading missing files...
echo.
echo [WARNING] This will download repository files into the current directory.
echo [WARNING] Any existing files with the same names may be overwritten.
echo.
set /p "PROCEED_REPAIR=Continue with repair download? (y/n): "
if /i "!PROCEED_REPAIR!" neq "y" (
    echo Repair cancelled by user.
    goto :exit_script
)

call :download_application
if !errorlevel! neq 0 goto :error_exit
goto :install_dependencies

:subfolder_install
echo [INFO] Installing to subfolder to avoid conflicts...
set "SUBFOLDER_NAME=NGO-Billing-App"
set "SUBFOLDER_PATH=%INSTALL_DIR%\%SUBFOLDER_NAME%"

if exist "%SUBFOLDER_PATH%" (
    echo [WARN] Subfolder %SUBFOLDER_NAME% already exists.
    set /p "OVERWRITE=Overwrite existing subfolder? (y/n): "
    if /i "!OVERWRITE!" neq "y" (
        echo Subfolder installation cancelled.
        goto :exit_script
    )
    rmdir /s /q "%SUBFOLDER_PATH%"
)

echo [INFO] Creating subfolder: %SUBFOLDER_NAME%
mkdir "%SUBFOLDER_PATH%"
cd /d "%SUBFOLDER_PATH%"

:: Update install directory for this session
set "INSTALL_DIR=%SUBFOLDER_PATH%"

echo [INFO] Starting fresh installation in: %SUBFOLDER_PATH%
goto :fresh_installation

:clean_install
echo [INFO] Performing clean installation...
echo [WARN] This will delete all existing files in this directory: %INSTALL_DIR%
echo.
dir /b 2>nul
echo.
set /p "CONFIRM=Are you sure? Type 'YES' to confirm: "
if /i "!CONFIRM!" neq "YES" (
    echo Clean install cancelled.
    goto :exit_script
)

:: Clean up existing files
echo [INFO] Cleaning directory...
for /f "delims=" %%i in ('dir /b 2^>nul') do (
    if exist "%%i\" (
        rmdir /s /q "%%i" 2>nul
        if exist "%%i\" echo [WARN] Could not remove directory: %%i
    ) else (
        del "%%i" 2>nul
        if exist "%%i" echo [WARN] Could not remove file: %%i
    )
)

echo [INFO] Directory cleaned. Starting fresh installation...
goto :fresh_installation

:: ===========================================================================
::                         EXISTING INSTALLATION
:: ===========================================================================
:existing_installation
echo [STATUS] Existing installation detected!
echo.

:: Check if application is built and ready
if exist "%BACKEND_PUBLIC_DIR%" (
    echo [STATUS] Application appears to be built and ready.
    echo.
    echo Choose an option:
    echo   1. Run the application (if already set up)
    echo   2. Update from repository and rebuild
    echo   3. Full rebuild (reinstall dependencies)
    echo   4. Exit
    echo.
    set /p "CHOICE=Enter choice (1-4): "
    
    if "!CHOICE!"=="1" goto :run_application
    if "!CHOICE!"=="2" goto :update_and_rebuild
    if "!CHOICE!"=="3" goto :full_rebuild
    if "!CHOICE!"=="4" goto :exit_script
    
    echo Invalid choice. Running application by default...
    goto :run_application
) else (
    echo [STATUS] Application needs to be built.
    goto :build_application
)

:: ===========================================================================
::                         FRESH INSTALLATION
:: ===========================================================================
:fresh_installation
echo [STATUS] Fresh installation starting...
echo.

:: Check admin privileges
call :check_admin_rights

:: Step 1: Check/Install Git
echo [STEP 1/7] Checking Git installation...
call :check_install_git

:: Step 2: Check/Install Node.js
echo [STEP 2/7] Checking Node.js installation...
call :check_install_nodejs

:: Step 3: Download application
echo [STEP 3/7] Downloading application from repository...
call :download_application

:: Step 4: Install dependencies
echo [STEP 4/7] Installing dependencies...
call :install_dependencies

:: Step 5: Build application
echo [STEP 5/7] Building application...
call :build_application

:: Step 6: Create shortcuts
echo [STEP 6/7] Creating shortcuts...
call :create_shortcuts

:: Step 7: Run application
echo [STEP 7/7] Starting application...
goto :run_application

:: ===========================================================================
::                              FUNCTIONS
:: ===========================================================================

:check_admin_rights
net session >nul 2>&1
if %errorlevel% == 0 (
    echo [INFO] Running with Administrator privileges.
) else (
    echo [WARN] Running with standard user privileges.
    echo [WARN] Administrator rights may be needed for Git/Node.js installation.
)
echo.
goto :eof

:check_install_git
git --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [INFO] Git not found. Installing Git for Windows...
    call :install_git
) else (
    echo [INFO] Git is already installed.
    git --version
)
echo.
goto :eof

:install_git
set "GIT_INSTALLER=%TEMP%\git-installer.exe"
echo [INFO] Downloading Git installer...
powershell -Command "try { Invoke-WebRequest -Uri '%GIT_DOWNLOAD_URL%' -OutFile '%GIT_INSTALLER%' -UseBasicParsing; Write-Host 'Download completed' } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }"

if !errorlevel! neq 0 (
    echo [ERROR] Failed to download Git installer.
    echo [ERROR] Please install Git manually from: https://git-scm.com/
    goto :error_exit
)

echo [INFO] Installing Git (this may take a few minutes)...
start /wait "%GIT_INSTALLER%" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS

:: Refresh PATH
call :refresh_environment

:: Verify installation
git --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Git installation failed.
    echo [ERROR] Please install manually or restart the script as Administrator.
    goto :error_exit
)

del "%GIT_INSTALLER%" 2>nul
echo [SUCCESS] Git installed successfully!
git --version
goto :eof

:check_install_nodejs
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [INFO] Node.js not found. Installing Node.js LTS...
    call :install_nodejs
) else (
    echo [INFO] Node.js is already installed.
    node --version
    npm --version
)
echo.
goto :eof

:install_nodejs
set "NODE_INSTALLER=%TEMP%\nodejs-installer.msi"
echo [INFO] Downloading Node.js installer...
powershell -Command "try { Invoke-WebRequest -Uri '%NODEJS_DOWNLOAD_URL%' -OutFile '%NODE_INSTALLER%' -UseBasicParsing; Write-Host 'Download completed' } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }"

if !errorlevel! neq 0 (
    echo [ERROR] Failed to download Node.js installer.
    echo [ERROR] Please install Node.js manually from: https://nodejs.org/
    goto :error_exit
)

echo [INFO] Installing Node.js (this may take a few minutes)...
msiexec /i "%NODE_INSTALLER%" /quiet /qn /norestart

:: Wait for installation
timeout /t 30 /nobreak >nul

:: Refresh PATH
call :refresh_environment

:: Verify installation
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js installation failed.
    echo [ERROR] Please install manually or restart the script as Administrator.
    goto :error_exit
)

del "%NODE_INSTALLER%" 2>nul
echo [SUCCESS] Node.js installed successfully!
node --version
npm --version
goto :eof

:download_application
:: Check if .git directory exists (partial clone)
if exist ".git" (
    echo [INFO] Git repository found. Checking status...
    git status >nul 2>&1
    if !errorlevel! neq 0 (
        echo [WARN] Git repository appears corrupted. Re-cloning...
        rmdir /s /q ".git" 2>nul
    )
)

if exist ".git" (
    echo [INFO] Updating existing repository...
    git pull origin %MAIN_BRANCH%
    if !errorlevel! neq 0 (
        echo [WARN] Git pull failed. Attempting to reset repository...
        git fetch origin
        git reset --hard origin/%MAIN_BRANCH%
        if !errorlevel! neq 0 (
            echo [ERROR] Repository update failed. Consider clean installation.
            goto :error_exit
        )
    )
) else (
    echo [INFO] Cloning repository...
    
    :: Check if directory has files that would conflict
    set "HAS_FILES=false"
    for %%f in (*) do set "HAS_FILES=true"
    for /d %%d in (*) do set "HAS_FILES=true"
    
    if "!HAS_FILES!"=="true" (
        echo [WARN] Directory is not empty. Using alternative clone method...
        
        :: Create temporary directory for cloning
        set "TEMP_CLONE_DIR=%TEMP%\ngo-billing-clone-%RANDOM%"
        git clone %REPO_URL% "!TEMP_CLONE_DIR!"
        if !errorlevel! neq 0 (
            echo [ERROR] Failed to clone repository to temporary location.
            echo [ERROR] Please check your internet connection and repository URL.
            goto :error_exit
        )
        
        :: Copy files from temp directory to current directory
        echo [INFO] Copying repository files...
        xcopy "!TEMP_CLONE_DIR!\*" . /e /h /k /y >nul 2>&1
        if !errorlevel! neq 0 (
            echo [ERROR] Failed to copy repository files.
            rmdir /s /q "!TEMP_CLONE_DIR!" 2>nul
            goto :error_exit
        )
        
        :: Clean up temp directory
        rmdir /s /q "!TEMP_CLONE_DIR!" 2>nul
        echo [INFO] Repository files copied successfully.
    ) else (
        :: Directory is empty, normal clone
        git clone %REPO_URL% .
        if !errorlevel! neq 0 (
            echo [ERROR] Failed to clone repository.
            echo [ERROR] Please check your internet connection and repository URL.
            goto :error_exit
        )
    )
)

:: Verify essential files were downloaded
call :verify_repository_integrity

echo [SUCCESS] Application downloaded successfully!
echo.
goto :eof

:verify_repository_integrity
echo [INFO] Verifying repository integrity...
set "MISSING_FILES="

if not exist "package.json" set "MISSING_FILES=!MISSING_FILES! package.json"
if not exist "%BACKEND_DIR%" set "MISSING_FILES=!MISSING_FILES! %BACKEND_DIR%"
if not exist "%FRONTEND_DIR%" set "MISSING_FILES=!MISSING_FILES! %FRONTEND_DIR%"
if not exist "%BACKEND_DIR%\index.js" set "MISSING_FILES=!MISSING_FILES! %BACKEND_DIR%\index.js"
if not exist "%BACKEND_DIR%\package.json" set "MISSING_FILES=!MISSING_FILES! %BACKEND_DIR%\package.json"
if not exist "%FRONTEND_DIR%\package.json" set "MISSING_FILES=!MISSING_FILES! %FRONTEND_DIR%\package.json"

if defined MISSING_FILES (
    echo [ERROR] Repository verification failed. Missing files:
    echo [ERROR] !MISSING_FILES!
    echo [ERROR] The repository may be incomplete or corrupted.
    goto :error_exit
) else (
    echo [SUCCESS] Repository integrity verified.
)
goto :eof

:install_dependencies
:: Verify we have the required package.json files before installing
if not exist "package.json" (
    echo [ERROR] Root package.json not found.
    echo [ERROR] Repository may not be properly downloaded.
    echo [INFO] Attempting to download repository files...
    call :download_application
    if !errorlevel! neq 0 goto :error_exit
)

echo [INFO] Installing root dependencies...
call npm install
if !errorlevel! neq 0 goto :npm_error

if exist "%BACKEND_DIR%\package.json" (
    echo [INFO] Installing backend dependencies...
    pushd %BACKEND_DIR%
    call npm install
    if !errorlevel! neq 0 (
        popd
        goto :npm_error
    )
    popd
) else (
    echo [WARN] Backend package.json not found, skipping backend dependencies.
)

if exist "%FRONTEND_DIR%\package.json" (
    echo [INFO] Installing frontend dependencies...
    pushd %FRONTEND_DIR%
    call npm install
    if !errorlevel! neq 0 (
        popd
        goto :npm_error
    )
    popd
) else (
    echo [WARN] Frontend package.json not found, skipping frontend dependencies.
)

echo [SUCCESS] Dependencies installed successfully!
echo.
goto :eof

:build_application
if not exist "%FRONTEND_DIR%\package.json" (
    echo [WARN] Frontend not found, skipping build step.
    goto :eof
)

echo [INFO] Building frontend application...
pushd %FRONTEND_DIR%
call %FRONTEND_BUILD_CMD%
if !errorlevel! neq 0 (
    popd
    echo [ERROR] Frontend build failed.
    goto :error_exit
)
popd

echo [INFO] Configuring backend to serve frontend...
if exist "%BACKEND_PUBLIC_DIR%" rmdir /s /q "%BACKEND_PUBLIC_DIR%"
if exist "%FRONTEND_DIR%\%BUILD_OUTPUT_DIR%" (
    xcopy /s /e /i "%FRONTEND_DIR%\%BUILD_OUTPUT_DIR%" "%BACKEND_PUBLIC_DIR%" >nul
    echo [SUCCESS] Frontend built and configured successfully!
) else (
    echo [ERROR] Frontend build output not found.
    goto :error_exit
)
echo.
goto :eof

:create_shortcuts
echo [INFO] Creating desktop shortcut...

:: Create desktop shortcut using VBScript
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo Set Shortcut = WshShell.CreateShortcut("%USERPROFILE%\Desktop\%APP_NAME%.lnk"^)
echo Shortcut.TargetPath = "cmd.exe"
echo Shortcut.Arguments = "/c cd /d ""%INSTALL_DIR%"" && ""%~nx0"""
echo Shortcut.WorkingDirectory = "%INSTALL_DIR%"
echo Shortcut.Description = "%APP_DESCRIPTION%"
echo Shortcut.Save
) > "%TEMP%\create_shortcut.vbs"

cscript //nologo "%TEMP%\create_shortcut.vbs" >nul 2>&1
del "%TEMP%\create_shortcut.vbs" >nul 2>&1

echo [SUCCESS] Desktop shortcut created!
echo.
goto :eof

:update_and_rebuild
echo [INFO] Updating from repository...
git pull origin %MAIN_BRANCH%
if !errorlevel! neq 0 (
    echo [ERROR] Failed to update from repository.
    pause
    goto :eof
)
goto :build_application

:full_rebuild
echo [INFO] Performing full rebuild...

:: First ensure we have all the required files
if not exist "package.json" (
    echo [WARN] package.json missing. Downloading repository files first...
    call :download_application
    if !errorlevel! neq 0 goto :error_exit
)

if not exist "%BACKEND_DIR%\package.json" if not exist "%FRONTEND_DIR%\package.json" (
    echo [WARN] No package.json files found. Downloading repository files first...
    call :download_application  
    if !errorlevel! neq 0 goto :error_exit
)

:: Clean up node_modules and build artifacts
echo [INFO] Cleaning up existing installations...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "%BACKEND_DIR%\node_modules" rmdir /s /q "%BACKEND_DIR%\node_modules"  
if exist "%FRONTEND_DIR%\node_modules" rmdir /s /q "%FRONTEND_DIR%\node_modules"
if exist "%BACKEND_PUBLIC_DIR%" rmdir /s /q "%BACKEND_PUBLIC_DIR%"

call :install_dependencies
goto :build_application

:run_application
echo.
echo ===========================================================================
echo                        STARTING %APP_NAME%
echo ===========================================================================
echo.

:: Check if backend exists and is configured
if not exist "%BACKEND_DIR%\index.js" (
    echo [ERROR] Backend not found. Application may not be properly installed.
    echo [ERROR] Try running this script again to reinstall.
    goto :error_exit
)

if not exist "%BACKEND_PUBLIC_DIR%" (
    echo [WARN] Frontend not built. Building now...
    call :build_application
)

echo [INFO] Application starting on http://localhost:%SERVER_PORT%
echo [INFO] The application will open in your default web browser.
echo [INFO] Press Ctrl+C to stop the application.
echo.

:: Create a small delay then open browser
start "" timeout /t 3 /nobreak ^& start "" http://localhost:%SERVER_PORT%

:: Start the backend server
pushd %BACKEND_DIR%
call %BACKEND_START_CMD%
popd

goto :exit_script

:refresh_environment
:: Refresh environment variables
for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "MACHINE_PATH=%%b"
for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%b"
if defined MACHINE_PATH if defined USER_PATH (
    set "PATH=%MACHINE_PATH%;%USER_PATH%"
) else if defined MACHINE_PATH (
    set "PATH=%MACHINE_PATH%"
) else if defined USER_PATH (
    set "PATH=%USER_PATH%"
)
goto :eof

:npm_error
echo [ERROR] Failed to install NPM dependencies.
echo [ERROR] This could be due to:
echo [ERROR]   - Network connectivity issues
echo [ERROR]   - NPM registry problems  
echo [ERROR]   - Insufficient disk space
echo [ERROR]   - Firewall/antivirus blocking
echo.
echo [INFO] Try running the script again with a stable internet connection.
goto :error_exit

:error_exit
echo.
echo ===========================================================================
echo                           INSTALLATION FAILED
echo ===========================================================================
echo.
echo [HELP] Troubleshooting steps:
echo [HELP] 1. Run this script as Administrator
echo [HELP] 2. Check your internet connection
echo [HELP] 3. Temporarily disable antivirus software
echo [HELP] 4. Ensure you have sufficient disk space
echo [HELP] 5. Try again after rebooting your computer
echo.
echo [HELP] For support, visit: %REPO_URL%
echo.
pause
exit /b 1

:exit_script
echo.
echo [INFO] Script finished. You can run this script again anytime to:
echo [INFO]   - Update the application
echo [INFO]   - Rebuild if needed  
echo [INFO]   - Start the application
echo.
pause
exit /b 0