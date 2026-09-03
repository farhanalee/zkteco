@echo off
title Stopping ZKTeco K40 Services
echo ========================================================
echo   Stopping ZKTeco K40 Attendance System Services...
echo ========================================================
echo.

echo Terminating Python Connector Daemon...
taskkill /F /IM python.exe /T >nul 2>&1

echo Terminating PHP Local Server...
taskkill /F /IM php.exe /T >nul 2>&1

echo.
echo [OK] All ZKTeco K40 services have been stopped.
timeout /t 2 /nobreak >nul
exit
