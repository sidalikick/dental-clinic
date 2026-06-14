@echo off
setlocal enabledelayedexpansion
title Dental Clinic System
cd /d "%~dp0"

:: 0. Database Password Prompt (Bypassed)
set "NEED_PASS=no"

:: 1. Find Local IP Address
set "MY_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4" ^| findstr /v "127.0.0.1"') do (
    set "temp_ip=%%a"
    set "MY_IP=!temp_ip: =!"
    goto :found_ip
)
:found_ip

:: 2. Check Firewall Rule
netsh advfirewall firewall show rule name="DentalClinicServer" >nul
if %errorlevel% neq 0 (
    echo [!] WARNING: Firewall rule for port 5000 is missing.
    echo [!] Phone access might not work. 
    echo [!] To fix, please run 'scripts\fix_firewall.ps1' as Administrator.
    echo.
)

:: 3. Check if the server is already running (port 5000)
netstat -ano | findstr :5000 | findstr LISTENING > nul
if %errorlevel% equ 0 (
    echo [OK] Server is already running.
) else (
    echo [!] Starting Server in background...
    start "Dental Clinic Server" /min cmd.exe /c "node server/launcher.js > server.log 2>&1"
    
    :: Wait a bit for server to initialize
    echo [*] Waiting for server to initialize...
    ping 127.0.0.1 -n 5 > nul
)

:: 4. Display Access URLs
echo.
echo ======================================================
echo    DENTAL CLINIC SYSTEM - ACCESS INFORMATION
echo ======================================================
echo.
echo  [PC]    URL: http://localhost:5000/reception
echo  [PHONE] URL: http://%MY_IP%:5000/reception
echo.
echo  Note: Make sure your phone is on the same Wi-Fi.
echo ======================================================
echo.

:: 5. Launch the Reception interface
echo Opening in windowed mode...
start msedge --app="http://localhost:5000/reception" || start chrome --app="http://localhost:5000/reception" || start "" "http://localhost:5000/reception"

echo.
echo Keep this window open if you want to see the IP address.
echo Press any key to close this window (Server will keep running).
pause > nul
exit
