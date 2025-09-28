# NGO Billing Application Launcher
# PowerShell script to set up and run the application

param(
    [switch]$SkipInstall,
    [switch]$DevMode
)

# Set console properties
$Host.UI.RawUI.WindowTitle = "NGO Billing App Setup"
$Host.UI.RawUI.BackgroundColor = "DarkBlue"
$Host.UI.RawUI.ForegroundColor = "White"
Clear-Host

function Write-Header {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "    NGO Billing Application Setup" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param($step, $total, $message)
    Write-Host "[$step/$total] $message" -ForegroundColor Green
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
        
        # Wait a moment for installation to complete
        Start-Sleep -Seconds 10
        
        # Verify installation
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

function Install-Dependencies {
    Write-Step 3 6 "Installing dependencies..."
    
    # Install root dependencies
    if (!(Test-Path "node_modules")) {
        Write-Host "Installing main dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install main dependencies"
        }
    }
    
    # Install backend dependencies
    if (!(Test-Path "backend/node_modules")) {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Push-Location backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            throw "Failed to install backend dependencies"
        }
        Pop-Location
    }
    
    # Install frontend dependencies
    if (!(Test-Path "frontend/node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Pop-Location
            throw "Failed to install frontend dependencies"
        }
        Pop-Location
    }
}

function Build-Frontend {
    Write-Step 4 6 "Building frontend application..."
    
    Push-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        throw "Frontend build failed"
    }
    Pop-Location
}

function Copy-FrontendToBuild {
    Write-Step 5 6 "Copying built frontend to backend..."
    
    if (Test-Path "backend/public") {
        Remove-Item -Recurse -Force "backend/public"
    }
    
    Copy-Item -Recurse "frontend/dist" "backend/public"
}

function Start-Application {
    Write-Step 6 6 "Starting application..."
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "    NGO Billing Application Started" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The application is now running!" -ForegroundColor Green
    Write-Host "Open your web browser and go to: http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location backend
    node index.js
    Pop-Location
}

# Main execution
try {
    Write-Header
    
    if (-not $SkipInstall) {
        Write-Step 1 6 "Checking Node.js installation..."
        if (-not (Test-NodeJS)) {
            if (-not (Install-NodeJS)) {
                throw "Node.js installation failed"
            }
        }
        
        Write-Step 2 6 "Verifying Node.js installation..."
        if (-not (Test-NodeJS)) {
            throw "Node.js is not properly installed"
        }
        
        Install-Dependencies
        Build-Frontend
        Copy-FrontendToBuild
    }
    
    Start-Application
}
catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Setup failed. Please check the error message above." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}