@echo off
title Serial Key Generator - Dental Clinic
color 0A

:: Check if node is installed (this runs on the developer's PC)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js to use this tool.
    pause
    exit /b
)

node keygen.js
pause
