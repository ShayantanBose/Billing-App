Set WshShell = CreateObject("WScript.Shell")
Dim fso, currentDir

' Get current directory
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Change to the application directory
WshShell.CurrentDirectory = currentDir

' Run the batch file silently with console window
WshShell.Run "cmd /c launch.bat", 1, False

' Optional: Open browser after a delay
WScript.Sleep 5000
WshShell.Run "http://localhost:3001", 1