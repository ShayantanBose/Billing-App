# NGO Billing Application Standalone Installer
# This script can be downloaded independently and will set up everything automatically
# Usage: Download this file and run: powershell -ExecutionPolicy Bypass -File install-ngo-billing-app.ps1

param(
    [string]$InstallPath = "$env:USERPROFILE\NGO-Billing-App",
    [string]$RepoUrl = "https://github.com/ShayantanBose/Billing-App.git"
)

# Set console properties
$Host.UI.RawUI.WindowTitle = "NGO Billing App Installer"
$Host.UI.RawUI.BackgroundColor = "DarkBlue"
$Host.UI.RawUI.ForegroundColor = "White"
Clear-Host

function Write-Header {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "    NGO Billing Application Installer" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Install Path: $InstallPath" -ForegroundColor Gray
    Write-Host ""
}

function Write-Step {
    param($step, $total, $message)
    Write-Host "[$step/$total] $message" -ForegroundColor Green
}

function Test-Git {
    try {
        git --version 2>$null | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Install-Git {
    Write-Host "Git is not installed. Installing..." -ForegroundColor Yellow

    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe"
    $installerPath = "$env:TEMP\git-installer.exe"

    try {
        Write-Host "Downloading Git installer..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $gitUrl -OutFile $installerPath -UseBasicParsing

        Write-Host "Installing Git..." -ForegroundColor Yellow
        Start-Process -FilePath $installerPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS=`"icons,ext\reg\shellhere,assoc,assoc_sh`"" -Wait

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        Start-Sleep -Seconds 5

        if (Test-Git) {
            Write-Host "Git installed successfully!" -ForegroundColor Green
            Remove-Item $installerPath -ErrorAction SilentlyContinue
            return $true
        } else {
            Write-Host "Git installation may have failed. Please restart PowerShell and try again." -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "Error installing Git: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        $npmVersion = npm --version 2>$null
        if ($nodeVersion -and $npmVersion) {
            Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
            Write-Host "npm is installed: $npmVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

function Install-NodeJS {
    Write-Host "Node.js is not installed. Installing..." -ForegroundColor Yellow

    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installerPath = "$env:TEMP\nodejs-installer.msi"

    try {
        Write-Host "Downloading Node.js installer..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing

        Write-Host "Installing Node.js..." -ForegroundColor Yellow
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$installerPath`" /quiet /qn /norestart" -Wait

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        Start-Sleep -Seconds 10

        if (Test-NodeJS) {
            Write-Host "Node.js installed successfully!" -ForegroundColor Green
            Remove-Item $installerPath -ErrorAction SilentlyContinue
            return $true
        } else {
            Write-Host "Node.js installation may have failed. Please restart PowerShell and try again." -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "Error installing Node.js: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Install-Application {
    Write-Step 4 7 "Downloading application files..."

    try {
        # Create install directory
        if (!(Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }

        # Clone repository
        Push-Location $InstallPath
        git clone $RepoUrl .
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to clone repository"
        }

        Write-Host "Application files downloaded successfully!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Error downloading application: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Pop-Location
    }
}

function Install-Dependencies {
    Write-Step 5 7 "Installing dependencies..."

    Push-Location $InstallPath
    try {
        # Install root dependencies
        Write-Host "Installing main dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install main dependencies"
        }

        # Install backend dependencies
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Push-Location backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            throw "Failed to install backend dependencies"
        }
        Pop-Location

        # Install frontend dependencies
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            throw "Failed to install frontend dependencies"
        }
        Pop-Location
    }
    finally {
        Pop-Location
    }
}

function Build-Application {
    Write-Step 6 7 "Building application..."

    Push-Location $InstallPath
    try {
        Push-Location frontend
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            throw "Frontend build failed"
        }
        Pop-Location

        # Copy built frontend to backend
        if (Test-Path "backend/public") {
            Remove-Item -Recurse -Force "backend/public"
        }
        Copy-Item -Recurse "frontend/dist" "backend/public"
    }
    finally {
        Pop-Location
    }
}

function Create-Shortcuts {
    Write-Step 7 7 "Creating shortcuts..."

    try {
        # Create desktop shortcut
        $WshShell = New-Object -comObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\NGO Billing App.lnk")
        $Shortcut.TargetPath = "powershell.exe"
        $Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$InstallPath\start-app.ps1`""
        $Shortcut.WorkingDirectory = $InstallPath
        $Shortcut.IconLocation = "$InstallPath\app-icon.ico"
        $Shortcut.Description = "NGO Billing Application"
        $Shortcut.Save()

        # Create start menu shortcut
        $StartMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
        $Shortcut = $WshShell.CreateShortcut("$StartMenuPath\NGO Billing App.lnk")
        $Shortcut.TargetPath = "powershell.exe"
        $Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$InstallPath\start-app.ps1`""
        $Shortcut.WorkingDirectory = $InstallPath
        $Shortcut.IconLocation = "$InstallPath\app-icon.ico"
        $Shortcut.Description = "NGO Billing Application"
        $Shortcut.Save()

        Write-Host "Shortcuts created successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Warning: Could not create shortcuts: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Main execution
try {
    Write-Header

    Write-Step 1 7 "Checking Git installation..."
    if (-not (Test-Git)) {
        if (-not (Install-Git)) {
            throw "Git installation failed"
        }
    }

    Write-Step 2 7 "Checking Node.js installation..."
    if (-not (Test-NodeJS)) {
        if (-not (Install-NodeJS)) {
            throw "Node.js installation failed"
        }
    }

    Write-Step 3 7 "Verifying installations..."
    if (-not (Test-NodeJS) -or -not (Test-Git)) {
        throw "Prerequisites are not properly installed"
    }

    if (-not (Install-Application)) {
        throw "Failed to download application files"
    }

    Install-Dependencies
    Build-Application
    Create-Shortcuts

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "    Installation Complete!" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The NGO Billing App has been installed successfully!" -ForegroundColor Green
    Write-Host "Installation path: $InstallPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can start the application by:" -ForegroundColor White
    Write-Host "  1. Double-clicking the desktop shortcut" -ForegroundColor Cyan
    Write-Host "  2. Running from Start Menu" -ForegroundColor Cyan
    Write-Host "  3. Running: powershell -File `"$InstallPath\start-app.ps1`"" -ForegroundColor Cyan
    Write-Host ""

    $startNow = Read-Host "Would you like to start the application now? (y/n)"
    if ($startNow -eq 'y' -or $startNow -eq 'Y') {
        Push-Location $InstallPath
        & .\start-app.ps1
        Pop-Location
    }
}
catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Installation failed. Please check the error message above." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
