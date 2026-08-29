@echo off
cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;%PATH%
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:8796
npm run dev
