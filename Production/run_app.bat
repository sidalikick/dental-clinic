@echo off
title Dental Clinic System
cd /d "%~dp0"

:: 1. Check if the server is already running (port 5000)
netstat -ano | findstr :5000 > nul
if %errorlevel% equ 0 (
    echo Server is already running.
) else (
    echo Starting Server in background...
    :: Create a temporary VBScript to start the server hidden
    echo Set WshShell = CreateObject^("WScript.Shell"^) > "%temp%\start_server.vbs"
    echo WshShell.Run "cmd.exe /c node server/launcher.js > server.log 2>&1", 0, False >> "%temp%\start_server.vbs"
    wscript "%temp%\start_server.vbs"
    
    :: Wait a bit for server to initialize
    echo Waiting for server...
    ping 127.0.0.1 -n 5 > nul
)

:: 2. Launch the Reception interface (Visible)
echo Opening browser...
start msedge --app="http://localhost:5000/reception" || start chrome --app="http://localhost:5000/reception" || start http://localhost:5000/reception

exit
