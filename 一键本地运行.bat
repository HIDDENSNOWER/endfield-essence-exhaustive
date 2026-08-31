@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动本地服务器，请勿关闭此窗口...

:: 尝试使用 Python
where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    python -m http.server 8000
    goto :eof
)

:: 尝试使用 Node.js
where npx >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    npx http-server -p 8000
    goto :eof
)

:: 未找到 Python 或 Node.js
echo.
echo [错误] 未检测到 Python 或 Node.js。
echo 请安装其中任意一个：
echo   Python: https://www.python.org/downloads/
echo   Node.js: https://nodejs.org/
echo 安装后重新双击本脚本。
pause