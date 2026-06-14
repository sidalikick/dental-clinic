@echo off
title Stop Dental Clinic System
echo Stopping the Dental Clinic Backend Server...

:: Forcefully kill any running node.exe process
taskkill /F /IM node.exe >nul 2>&1

if %ERRORLEVEL% == 0 (
    echo Server has been successfully stopped.
) else (
    echo No server process was found running.
)

echo.
echo Press any key to exit...
pause >nul
