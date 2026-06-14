@echo off
setlocal enabledelayedexpansion
title Dental Clinic System - Setup Wizard

:: ==========================================
:: DENTAL CLINIC SYSTEM SETUP WIZARD
:: ==========================================

cls
echo.
echo  ======================================================
echo     WELCOME TO DENTAL CLINIC SYSTEM SETUP
echo  ======================================================
echo.
echo  This wizard will help you install the system on this computer.
echo.

:: 1. Check Node.js
echo [1/5] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is NOT installed.
    if exist "Installers\node*.msi" (
        echo [!] Found Node.js installer in "Installers" folder.
        echo Starting installation...
        for %%f in (Installers\node*.msi) do (
            echo Running %%f...
            start /wait msiexec /i "%%f" /passive
        )
        echo [!] Please restart this setup AFTER Node.js installation is finished.
        pause
        exit
    ) else (
        echo [!] No local installer found. Opening download page...
        start https://nodejs.org/
        echo Please install Node.js (LTS version) and restart this setup.
        pause
        exit
    )
) else (
    echo [OK] Node.js is installed.
)

:: 2. Check PostgreSQL
echo [2/5] Checking for PostgreSQL...
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] PostgreSQL (psql) is NOT found in PATH.
    if exist "Installers\postgre*.exe" (
        echo [!] Found PostgreSQL installer in "Installers" folder.
        echo [!] Starting installation...
        for %%f in (Installers\postgre*.exe) do (
            echo Running %%f...
            start "" "%%f"
        )
        echo [!] Follow the instructions to install PostgreSQL.
        echo [!] IMPORTANT: Make sure to check "Add to PATH" if available, or add the "bin" folder manually.
        pause
    ) else (
        echo [!] PostgreSQL (psql) is NOT found.
        echo If you haven't installed PostgreSQL, please download it here:
        echo https://www.postgresql.org/download/windows/
        pause
    )
) else (
    echo [OK] PostgreSQL found.
)

:: 3. Install Dependencies
echo [3/5] Installing software dependencies...
if exist node_modules (
    echo [OK] Dependencies already present, skipping npm install.
) else (
    echo [!] Installing dependencies (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo [!] Error during npm install. Make sure you are connected to the internet.
        pause
        exit
    )
)

:: 4. Database Configuration
echo [4/5] Setting up Database...
if not exist .env (
    echo [!] .env file missing. Creating a default one...
    echo DB_USER=postgres> .env
    echo DB_HOST=localhost>> .env
    echo DB_NAME=dental_clinic>> .env
    echo DB_PORT=5432>> .env
    set /p DB_PASS="Enter your PostgreSQL password: "
    echo DB_PASSWORD=!DB_PASS!>> .env
    echo PORT=5000>> .env
)

echo Initializing Database Tables...
node scripts/auto_setup.js
if %errorlevel% neq 0 (
    echo [!] Database initialization failed. Check your password in .env.
    pause
    exit
)

:: 5. Create Desktop Shortcut (VBScript method)
echo [5/5] Creating Desktop Shortcut...
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Dental Clinic.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0run_app.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "Dental Clinic System Launcher" >> %SCRIPT%
echo oLink.IconLocation = "C:\Windows\System32\shell32.dll, 45" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo  ======================================================
echo     SETUP COMPLETED SUCCESSFULLY!
echo  ======================================================
echo.
echo  1. You now have a "Dental Clinic" icon on your desktop.
echo  2. Double-click it to start the system.
echo.
echo  Enjoy using your new system!
echo.
pause
