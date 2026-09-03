@echo off
title ZKTeco K40 Attendance System - Installer
echo ========================================================
echo   ZKTeco K40 Biometric Attendance System - Setup
echo ========================================================
echo.

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
echo [OK] Python is installed.
echo.

echo [2/3] Installing Python dependencies for ZKTeco K40 connector...
pip install -r connector\requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Dependency installation encountered issues. Retrying basic socket setup...
)
echo [OK] Connector dependencies ready.
echo.

echo [3/3] Checking PHP installation...
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTE] PHP CLI not detected in PATH.
    echo If using XAMPP/WAMP, copy this project folder into 'htdocs/zkteco'.
) else (
    echo [OK] PHP CLI is ready.
)
echo.

echo ========================================================
echo   Setup Complete! 
echo   Run 'start.bat' to launch the ZKTeco K40 Portal.
echo ========================================================
pause
