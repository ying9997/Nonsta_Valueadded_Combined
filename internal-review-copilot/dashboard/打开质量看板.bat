@echo off
cd /d "%~dp0"
echo 正在打开 内部智能审核助手 · 质量看板
echo 正在尝试从 40 刷新看板数据...
powershell -ExecutionPolicy Bypass -File "%~dp0refresh-from-40.ps1"
if errorlevel 1 echo 刷新失败，将使用本机已有 data.js
echo 地址 http://127.0.0.1:8765/
start "" "http://127.0.0.1:8765/"
node "%~dp0serve.mjs"
