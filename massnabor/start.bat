@echo off
:: Теперь нам не нужен путь, так как файл уже в папке
start /b npm run dev
timeout /t 5 /nobreak > nul
start chrome --app=http://localhost:3000