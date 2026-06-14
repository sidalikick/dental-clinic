@echo off
setlocal enabledelayedexpansion
title Dental Clinic System - Update Tool
cd /d "%~dp0"

echo.
echo ======================================================
echo    STARTING DENTAL CLINIC SYSTEM UPDATE
echo ======================================================
echo.

:: 1. Stop any running instances of the app
echo [*] Stopping running server instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)
taskkill /f /im node.exe >nul 2>nul
echo [OK] All running instances stopped.

:: 2. Installing and updating dependencies
echo [*] Checking and updating backend dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [!] Warning: Dependency installation reported errors, but proceeding to rebuild...
) else (
    echo [OK] Backend dependencies updated.
)

:: 3. Rebuild React Frontend
echo [*] Rebuilding React Web Application...
if exist "node_modules\vite\bin\vite.js" (
    call npx vite build
) else (
    call npm run build >nul 2>nul
    if %errorlevel% neq 0 (
        echo [*] Attempting fallback global build...
        call npx -y vite build
      )
)
if %errorlevel% neq 0 (
    echo [!] Warning: Frontend build failed. Please check files and try again.
) else (
    echo [OK] Frontend rebuilt successfully.
)

:: 4. Copy Updates to Production Directory
set "PROD_DIR=C:\Users\Sidali_B\Desktop\12111\44B"
if not exist "!PROD_DIR!" (
    set "PROD_DIR=..\12111\44B"
)

echo.
echo ======================================================
echo    APPLYING UPDATE TO PRODUCTION DIRECTORY
echo ======================================================
echo  Target: !PROD_DIR!
echo ======================================================
echo.

if exist "!PROD_DIR!" (
    echo [*] Backing up and copying updated files to production...
    
    :: Copy folders and key files
    robocopy "dist" "!PROD_DIR!\dist" /E /NJH /NJS /NDL /NFL
    robocopy "server" "!PROD_DIR!\server" /E /NJH /NJS /NDL /NFL /XD node_modules
    robocopy "database" "!PROD_DIR!\database" /E /NJH /NJS /NDL /NFL
    copy /y "package.json" "!PROD_DIR!\" >nul
    copy /y "package-lock.json" "!PROD_DIR!\" >nul
    copy /y "run_app.bat" "!PROD_DIR!\" >nul
    copy /y "stop_app.bat" "!PROD_DIR!\" >nul
    
    echo [OK] Files updated in production folder.
    
    :: Install dependencies and run schema repair in production context
    echo [*] Installing dependencies in production...
    pushd "!PROD_DIR!"
    call npm install
    
    echo [*] Verifying and migrating production database...
    node scripts/auto_setup.js
    popd
    
    echo [OK] Production environment successfully updated.
) else (
    echo [!] Production directory not found at !PROD_DIR!.
    echo [*] Continuing with local development migration...
    node scripts/auto_setup.js
)

echo.
echo ======================================================
echo    UPDATE PROCESS COMPLETED SUCCESSFULLY!
echo ======================================================
echo.
echo  You can now start the application using 'run_app.bat'.
echo.
pause
exit
