@echo off
cd /d "%~dp0"
echo DEMOSTRACION LOCAL: http://localhost:3001
echo Usuarios: admin, ana, luis, caja. Clave: demo1234
echo Esta demostracion usa datos separados y solo abre en esta PC.
node scripts/demo.js
pause
