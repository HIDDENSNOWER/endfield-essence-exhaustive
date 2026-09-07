@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo   清理 data\images 中未被 data.json 引用的图片
echo ============================================
echo.

set "DATA_JSON=data.json"
set "IMAGES_DIR=images"

if not exist "%DATA_JSON%" (
    echo [错误] 未找到 %DATA_JSON%
    pause
    exit /b 1
)

if not exist "%IMAGES_DIR%" (
    echo [错误] 未找到 %IMAGES_DIR% 目录
    pause
    exit /b 1
)

:: 使用 PowerShell 解析 JSON 并删除未引用文件
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$jsonPath = '%DATA_JSON%';" ^
  "$imagesDir = '%IMAGES_DIR%';" ^
  "$raw = Get-Content -Raw -Encoding UTF8 $jsonPath | ConvertFrom-Json;" ^
  "$rows = if ($raw.rows) { $raw.rows } else { $raw };" ^
  "$referenced = @{};" ^
  "foreach ($row in $rows) { if ($row.data) { foreach ($cell in $row.data) { if ($cell.note -and $cell.note.images) { foreach ($img in $cell.note.images) { if ($img -notmatch '^data:') { $name = Split-Path $img -Leaf; $referenced[$name] = $true } } } } } };" ^
  "$files = Get-ChildItem -File $imagesDir;" ^
  "$toDelete = @();" ^
  "foreach ($f in $files) { if (-not $referenced.ContainsKey($f.Name)) { $toDelete += $f } };" ^
  "if ($toDelete.Count -eq 0) { Write-Host '没有需要清理的无关文件。' -ForegroundColor Green } else { Write-Host ('将删除以下 ' + $toDelete.Count + ' 个文件：') -ForegroundColor Yellow; $toDelete | ForEach-Object { Write-Host ('  - ' + $_.Name) }; $confirmation = Read-Host '确认删除？(y/N)'; if ($confirmation -eq 'y' -or $confirmation -eq 'Y') { $toDelete | Remove-Item -Force; Write-Host ('已删除 ' + $toDelete.Count + ' 个文件。') -ForegroundColor Green } else { Write-Host '已取消删除。' -ForegroundColor Cyan } }"

echo.
pause