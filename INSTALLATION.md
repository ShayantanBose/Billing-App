# NGO Billing App Installation Guide

This guide provides multiple ways to install and run the NGO Billing Application.

## Quick Start (Recommended for End Users)

### Option 1: Standalone Installer (PowerShell)

1. Download `install-ngo-billing-app.ps1`
2. Right-click and select "Run with PowerShell" OR open PowerShell and run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File install-ngo-billing-app.ps1
   ```
3. The installer will automatically:
   - Download and install Git (if needed)
   - Download and install Node.js (if needed)
   - Download the application files from GitHub
   - Install all dependencies
   - Build the application
   - Create desktop and start menu shortcuts

### Option 2: Standalone Installer (Batch File)

1. Download `install-ngo-billing-app.bat`
2. Double-click to run
3. Follow the same automated process as above

## Manual Installation (For Developers)

### If you already have the repository:

1. Run `start-app.ps1` (PowerShell) or `start-app.bat` (Command Prompt)
2. These scripts will automatically fetch any missing files from the repository

### If you need to clone the repository:

```bash
git clone https://github.com/ShayantanBose/Billing-App.git
cd Billing-App
# Then run start-app.ps1 or start-app.bat
```

## What Each Script Does

### `install-ngo-billing-app.ps1` / `install-ngo-billing-app.bat`

- **Purpose**: Complete standalone installer for end users
- **What it does**:
  - Installs Git if not present
  - Installs Node.js if not present
  - Downloads the entire application from GitHub
  - Sets up all dependencies
  - Creates shortcuts
  - Can run from anywhere

### `start-app.ps1` / `start-app.bat`

- **Purpose**: Setup and launch scripts for when you have some files
- **What it does**:
  - Checks for required application files
  - Downloads missing files from GitHub if needed
  - Installs missing dependencies (Git, Node.js)
  - Builds and launches the application

### `launch.bat`

- **Purpose**: Quick launcher for already-setup installations
- **What it does**:
  - Runs first-time setup if needed (calls start-app.bat)
  - Otherwise just starts the application

## System Requirements

- Windows 10 or later
- Internet connection (for initial setup)
- Administrator privileges (for installing Git and Node.js)

## Troubleshooting

### If Git installation fails:

- Download and install Git manually from: https://git-scm.com/
- Restart the installer script

### If Node.js installation fails:

- Download and install Node.js manually from: https://nodejs.org/
- Choose the LTS version
- Restart the installer script

### If the application won't start:

- Make sure Windows Defender/Antivirus isn't blocking the files
- Try running as Administrator
- Check that ports 3001 and 5173 are not in use by other applications

## Usage

Once installed, the application will:

1. Start a backend server on `http://localhost:3001`
2. Serve the frontend web application at the same URL
3. Open automatically in your default web browser

## File Structure After Installation

```
NGO-Billing-App/
├── backend/           # Server-side code
├── frontend/          # Client-side code
├── start-app.ps1      # PowerShell launcher
├── start-app.bat      # Batch launcher
├── launch.bat         # Quick launcher
└── package.json       # Project configuration
```

## For Advanced Users

### Custom installation path:

```powershell
./install-ngo-billing-app.ps1 -InstallPath "C:\MyApps\NGO-Billing"
```

### Skip dependency installation:

```powershell
./start-app.ps1 -SkipInstall
```

### Development mode:

```powershell
./start-app.ps1 -DevMode
```
