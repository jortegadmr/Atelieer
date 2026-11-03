@echo off
rem Crea el instalador de Atelier para Windows (T9.1). Tarda varios minutos.
rem Al acabar abre la carpeta con el instalador (Atelier v2_..._x64-setup.exe).
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)
echo Compilando Atelier v2. Tarda varios minutos...
call npm run tauri build -- --bundles nsis
if errorlevel 1 (
  echo.
  echo Algo ha fallado. Copia el mensaje de arriba y revisalo.
  pause
  exit /b 1
)
explorer "%~dp0src-tauri\target\release\bundle\nsis"
echo Listo. El instalador esta en la carpeta que se acaba de abrir.
pause
