; NGO Billing Application Installer
; NSIS Script to create Windows installer

!define APPNAME "NGO Billing App"
!define COMPANYNAME "NGO"
!define DESCRIPTION "Bill OCR and Expense Tracking Application"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0
!define HELPURL "https://github.com/ShayantanBose/Billing-App"
!define UPDATEURL "https://github.com/ShayantanBose/Billing-App/releases"
!define ABOUTURL "https://github.com/ShayantanBose/Billing-App"
!define INSTALLSIZE 150000 ; Size estimate in KB

RequestExecutionLevel admin
InstallDir "$PROGRAMFILES\${APPNAME}"
LicenseData "LICENSE"
Name "${APPNAME}"
Icon "app-icon.ico"
outFile "${APPNAME}-Setup.exe"

!include LogicLib.nsh
!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "app-icon.ico"
!define MUI_UNICON "app-icon.ico"

!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Core Application" SecCore
    SectionIn RO ; Read-only, always installed
    
    SetOutPath $INSTDIR
    
    ; Copy application files
    File /r "backend\*.*"
    File /r "frontend\*.*"
    File "package.json"
    File "start-app.bat"
    File "start-app.ps1"
    File "README.md"
    
    ; Create start menu entries
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\start-app.bat" "" "$INSTDIR\app-icon.ico"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    
    ; Create desktop shortcut
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\start-app.bat" "" "$INSTDIR\app-icon.ico"
    
    ; Registry information for add/remove programs
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "InstallLocation" "$\"$INSTDIR$\""
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$\"$INSTDIR\app-icon.ico$\""
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${COMPANYNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "HelpLink" "${HELPURL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLUpdateInfo" "${UPDATEURL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "${ABOUTURL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMinor" ${VERSIONMINOR}
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "EstimatedSize" ${INSTALLSIZE}
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Node.js Runtime" SecNodeJS
    ; Check if Node.js is already installed
    nsExec::ExecToLog '"node" --version'
    Pop $0
    ${If} $0 != 0
        DetailPrint "Node.js not found. Downloading and installing..."
        
        ; Download Node.js
        NSISdl::download "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" "$TEMP\nodejs-installer.msi"
        Pop $R0
        ${If} $R0 == "success"
            DetailPrint "Installing Node.js..."
            ExecWait '"msiexec" /i "$TEMP\nodejs-installer.msi" /quiet /qn /norestart'
            Delete "$TEMP\nodejs-installer.msi"
            DetailPrint "Node.js installation completed."
        ${Else}
            MessageBox MB_OK "Failed to download Node.js. Please install it manually from nodejs.org"
        ${EndIf}
    ${Else}
        DetailPrint "Node.js is already installed."
    ${EndIf}
SectionEnd

Section "Install Dependencies" SecDeps
    SetOutPath $INSTDIR
    
    DetailPrint "Installing application dependencies..."
    nsExec::ExecToLog '"npm" install'
    
    SetOutPath "$INSTDIR\backend"
    nsExec::ExecToLog '"npm" install'
    
    SetOutPath "$INSTDIR\frontend"
    nsExec::ExecToLog '"npm" install'
    
    DetailPrint "Building frontend application..."
    nsExec::ExecToLog '"npm" run build'
    
    SetOutPath $INSTDIR
    DetailPrint "Copying built frontend to backend..."
    
    ; Copy frontend build to backend public folder
    CreateDirectory "$INSTDIR\backend\public"
    CopyFiles /SILENT "$INSTDIR\frontend\dist\*.*" "$INSTDIR\backend\public\"
SectionEnd

Section "Auto-start Setup" SecAutoStart
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APPNAME}" "$INSTDIR\start-app.bat"
SectionEnd

Section "un.Uninstall"
    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APPNAME}"
    
    ; Remove start menu entries
    Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"
    RMDir "$SMPROGRAMS\${APPNAME}"
    
    ; Remove desktop shortcut
    Delete "$DESKTOP\${APPNAME}.lnk"
    
    ; Remove application files
    RMDir /r "$INSTDIR"
SectionEnd

; Component descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} "Core application files (required)"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecNodeJS} "Downloads and installs Node.js runtime if not present"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDeps} "Downloads and installs NPM dependencies and builds the application"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecAutoStart} "Automatically start the application when Windows starts"
!insertmacro MUI_FUNCTION_DESCRIPTION_END