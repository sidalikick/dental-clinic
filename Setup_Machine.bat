@echo off
setlocal enabledelayedexpansion
title Dental Clinic System Setup

cls
echo.
echo  ======================================================
echo     WELCOME TO DENTAL CLINIC SYSTEM SETUP
echo  ======================================================
echo.
echo  This script will prepare the system for this computer.
echo.

:: 1. Check Node.js
echo [1/5] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is MISSING. Please install it from nodejs.org
    pause
    exit /b
)
echo OK.

:: 2. Check PostgreSQL
echo [2/5] Checking for PostgreSQL...
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo PostgreSQL was not found in your PATH.
    echo Please ensure it is installed.
) else (
    echo OK.
)

:: 3. Install Dependencies
echo [3/5] Installing dependencies...
if exist node_modules (
    echo Already present.
) else (
    echo Installing... please wait.
    call npm install
)

:: 4. Database Configuration
echo [4/5] Setting up Database...
if not exist .env (
    echo Creating .env file...
    echo DB_USER=postgres> .env
    echo DB_HOST=localhost>> .env
    echo DB_NAME=dental_clinic>> .env
    echo DB_PORT=5432>> .env
    set /p DB_PASS="Enter your PostgreSQL password: "
    echo DB_PASSWORD=!DB_PASS!>> .env
    echo PORT=5000>> .env
)

echo Initializing database...
node scripts/auto_setup.js
if %errorlevel% neq 0 (
    echo Database setup failed.
    pause
    exit /b
)

:: 5. Create Desktop Shortcut
echo [5/5] Creating Desktop Shortcut...
set SCRIPT="%TEMP%\setup_link.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Dental Clinic.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0run_app.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "Dental Clinic System" >> %SCRIPT%
echo oLink.IconLocation = "C:\Windows\System32\shell32.dll, 45" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo  ======================================================
echo     SETUP COMPLETED!
echo  ======================================================
echo.
echo  Double-click the "Dental Clinic" icon on your desktop.
echo.
pause
