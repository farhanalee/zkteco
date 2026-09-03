@echo off
setlocal enabledelayedexpansion
title ZKTeco K40 Attendance System - Launcher
echo ========================================================
echo   Starting ZKTeco K40 Biometric Attendance Portal
echo ========================================================
echo.

:: 1. Detect Python
echo [1/3] Checking Python & ZKTeco Standalone Driver...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH. Please install Python from python.org.
    pause
    exit /b 1
)

:: Ensure dependencies (pyzk, requests, urllib3) are installed
echo [INFO] Verifying ZKTeco Standalone driver packages (pyzk)...
python -c "import zk" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing pyzk Standalone SDK driver...
    pip install pyzk requests urllib3 --quiet
)

echo Starting Python ZKTeco Connector Daemon on 127.0.0.1:9000...
start "ZKTeco Python Connector" /min python connector\main.py
timeout /t 2 /nobreak >nul

:: 2. Detect PHP executable (PATH or common locations like XAMPP / WAMP / Laragon)
echo.
echo [2/3] Detecting Web Server Engine (PHP / Node)...
set PHP_CMD=

:: Check if php is in system PATH
where php >nul 2>&1
if %errorlevel% equ 0 (
    set PHP_CMD=php
) else (
    :: Check common XAMPP / WAMP / Laragon / PHP install paths
    if exist "C:\xampp\php\php.exe" (
        set PHP_CMD="C:\xampp\php\php.exe"
        echo [INFO] Detected PHP at C:\xampp\php\php.exe
    ) else if exist "C:\laragon\bin\php\php.exe" (
        set PHP_CMD="C:\laragon\bin\php\php.exe"
        echo [INFO] Detected PHP in Laragon
    ) else if exist "C:\php\php.exe" (
        set PHP_CMD="C:\php\php.exe"
        echo [INFO] Detected PHP at C:\php\php.exe
    ) else if exist "D:\xampp\php\php.exe" (
        set PHP_CMD="D:\xampp\php\php.exe"
        echo [INFO] Detected PHP at D:\xampp\php\php.exe
    )
)

if not "%PHP_CMD%"=="" (
    echo [OK] Launching Local PHP Web Server on http://localhost:3000/zkteco/ ...
    start "ZKTeco Web Server" /min %PHP_CMD% -S 0.0.0.0:3000 -t .
    timeout /t 1 /nobreak >nul
    echo Opening browser...
    start http://localhost:3000/zkteco/public/
) else (
    :: Check if Node.js / npm is available for React portal
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        echo [NOTE] PHP was not found, but Node.js/npm was detected!
        echo Starting modern React Dashboard (npm run dev)...
        start "ZKTeco React Portal" /min cmd /c "npm run dev"
        timeout /t 3 /nobreak >nul
        start http://localhost:3000
    ) else (
        echo ========================================================
        echo [ERROR] PHP was not found on your Windows PC!
        echo ========================================================
        echo.
        echo To fix this error:
        echo 1. If you have XAMPP installed:
        echo    - Open Environment Variables in Windows
        echo    - Add 'C:\xampp\php' to your System PATH
        echo    - OR copy this folder into 'C:\xampp\htdocs\zkteco'
        echo.
        echo 2. If you don't have PHP:
        echo    - Download XAMPP from https://www.apachefriends.org/
        echo    - OR download PHP zip from https://windows.php.net/download/
        echo.
        echo 3. Alternatively, install Node.js (https://nodejs.org) to run the React interface.
        echo ========================================================
        pause
        exit /b 1
    )
)

echo.
echo ========================================================
echo   ZKTeco K40 Portal is RUNNING!
echo   Web URL: http://localhost:3000/
echo   To stop all services, run 'stop.bat'.
echo ========================================================
echo.
pause

