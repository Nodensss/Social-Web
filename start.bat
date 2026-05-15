@echo off
chcp 65001 >nul
setlocal enableextensions
cd /d "%~dp0"

echo ============================================
echo   ToyVerse - запуск локальной соцсети
echo ============================================
echo.

REM --- 1. Проверка Docker ---
where docker >nul 2>&1
if errorlevel 1 (
  echo [ОШИБКА] Docker не найден.
  echo Установите Docker Desktop: https://www.docker.com/products/docker-desktop
  echo Запустите его и снова откройте этот файл.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [ОШИБКА] Docker не запущен.
  echo Откройте Docker Desktop, дождитесь зелёного значка и снова запустите этот файл.
  pause
  exit /b 1
)

REM --- 2. Проверка Node / pnpm ---
where node >nul 2>&1
if errorlevel 1 (
  echo [ОШИБКА] Node.js не найден. Установите Node 20+: https://nodejs.org
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm не найден, устанавливаю...
  call npm install -g pnpm@9.12.0
  if errorlevel 1 (
    echo [ОШИБКА] Не удалось установить pnpm.
    pause
    exit /b 1
  )
)

REM --- 3. Файл .env ---
if not exist ".env" (
  echo Создаю .env из .env.example...
  copy ".env.example" ".env" >nul
)

REM --- 4. База данных в Docker ---
echo Поднимаю базу данных...
docker start toyverse-pg >nul 2>&1
if errorlevel 1 (
  docker run -d --name toyverse-pg -e POSTGRES_USER=toyverse -e POSTGRES_PASSWORD=toyverse -e POSTGRES_DB=toyverse -p 5432:5432 postgres:16 >nul
  if errorlevel 1 (
    echo [ОШИБКА] Не удалось запустить контейнер базы данных.
    pause
    exit /b 1
  )
)

echo Жду готовности базы...
set TRIES=0
:waitdb
docker exec toyverse-pg pg_isready -U toyverse >nul 2>&1
if not errorlevel 1 goto dbready
set /a TRIES+=1
if %TRIES% geq 30 (
  echo [ОШИБКА] База не ответила вовремя.
  pause
  exit /b 1
)
timeout /t 1 >nul
goto waitdb
:dbready
echo База готова.

REM --- 5. Зависимости и схема ---
if not exist "node_modules" (
  echo Устанавливаю зависимости (только при первом запуске, может занять пару минут)...
  call pnpm install
  if errorlevel 1 (
    echo [ОШИБКА] Не удалось установить зависимости.
    pause
    exit /b 1
  )
)

echo Готовлю схему базы...
call pnpm db:generate
call pnpm db:push
if errorlevel 1 (
  echo [ОШИБКА] Не удалось применить схему базы.
  pause
  exit /b 1
)

REM --- 6. Локальный IP для телефона ---
set LANIP=
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*' } | Select-Object -First 1 -ExpandProperty IPAddress)"') do set LANIP=%%i

echo.
echo ============================================
echo   ГОТОВО! Соцсеть запускается.
echo.
echo   На этом компьютере:  http://localhost:3000
if defined LANIP (
echo   С телефона (Wi-Fi):  http://%LANIP%:3000
) else (
echo   С телефона: откройте http://[IP-этого-компьютера]:3000
)
echo.
echo   Чтобы выключить соцсеть - закройте это окно.
echo ============================================
echo.

REM --- 7. Запуск сервера ---
call pnpm dev
pause
