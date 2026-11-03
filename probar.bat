@echo off
rem Abre Atelier en modo prueba. Para cerrar: cierra la app y despues esta ventana.
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias, la primera vez tarda unos minutos...
  call npm install
)
echo Abriendo Atelier. La primera vez tarda varios minutos (compila Rust)...
call npm run tauri dev
pause
