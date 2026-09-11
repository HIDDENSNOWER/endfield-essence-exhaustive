@echo off
cd /d "%~dp0"
node "%~dp0bump-version.js" %*
echo.
pause