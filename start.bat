@echo off
setlocal enableextensions
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   ToyVerse - запуск локального окружения
echo ============================================
echo.

REM --- 1. Проверка Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [ОШИБКА] Node.js не найден. Установите Node 20+ с https://nodejs.org/
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Node: %%v

REM --- 2. Включаем pnpm через corepack ---
where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm не найден, включаю через corepack...
  call corepack enable
  call corepack prepare pnpm@9.12.0 --activate
  if errorlevel 1 (
    echo [ОШИБКА] Не удалось активировать pnpm. Выполните вручную: npm i -g pnpm@9.12.0
    pause
    exit /b 1
  )
)
for /f "delims=" %%v in ('pnpm -v') do echo pnpm: %%v
echo.

REM --- 3. Файл .env ---
if not exist ".env" (
  echo .env не найден, копирую из .env.example...
  copy /y ".env.example" ".env" >nul
  echo Создан .env - при необходимости отредактируйте ключи и строки подключения.
  echo.
)

REM --- 4. Установка зависимостей ---
if not exist "node_modules" (
  echo Устанавливаю зависимости ^(pnpm install^)...
  call pnpm install
  if errorlevel 1 (
    echo [ОШИБКА] pnpm install завершился с ошибкой.
    pause
    exit /b 1
  )
) else (
  echo node_modules найден, пропускаю установку. Для переустановки удалите папку node_modules.
)
echo.

REM --- 5. Генерация Prisma-клиента ---
echo Генерирую Prisma-клиент...
call pnpm db:generate
if errorlevel 1 (
  echo [ПРЕДУПРЕЖДЕНИЕ] pnpm db:generate завершился с ошибкой. Продолжаю запуск.
)
echo.

REM --- 6. Запуск dev (web + bot + jobs) ---
echo Запускаю dev-окружение ^(web + bot + jobs^)...
echo Web будет доступен на http://localhost:3000
echo Для остановки нажмите Ctrl+C.
echo.
call pnpm dev

pause
endlocal
