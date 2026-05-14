@echo off
REM ── BrushPack Backend Starter ──────────────────────────────────────────────
REM Always run from the backend\ folder, venv auto-activated.

cd /d "%~dp0"

REM Check venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found.
    echo Run this first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo.
echo  BrushPack API starting...
echo  URL : http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo  Press Ctrl+C to stop.
echo.

uvicorn main:app --reload --port 8000
