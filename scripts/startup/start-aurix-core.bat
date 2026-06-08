@echo off
echo Spoustim AURIX Core...

cd /d "%~dp0..\..\desktop-app"

if not exist node_modules (
    echo Instaluji balicky...
    npm.cmd install
)

npm.cmd run electron-dev

pause