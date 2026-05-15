@echo off
REM ── BrushPack — Start Everything ───────────────────────────────────────────
REM Starts the FastAPI backend (port 8000) and the Vite frontend (port 5173)
REM Run this file from any location — it finds itself automatically.

cd /d "%~dp0"

echo.
echo  BrushPack — Starting backend + frontend
echo  ─────────────────────────────────────────
echo.

REM ── 1. Check backend venv ──────────────────────────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Backend virtual environment not found.
    echo.
    echo  Please set it up first:
    echo    cd backend
    echo    python -m venv venv
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

REM ── 2. Check frontend node_modules ────────────────────────────────────────
if not exist "frontend\node_modules" (
    echo [INFO] node_modules not found — installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

REM ── 3. Start backend in a new window ──────────────────────────────────────
echo  [1/2] Starting backend on http://localhost:8000 ...
start "BrushPack Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && echo. && echo  API docs: http://localhost:8000/docs && echo  Press Ctrl+C to stop. && echo. && uvicorn main:app --reload --port 8000"

REM Give backend a moment to initialize before frontend starts
timeout /t 2 /nobreak >nul

REM ── 4. Start frontend in a new window ─────────────────────────────────────
echo  [2/2] Starting frontend on http://localhost:5173 ...
start "BrushPack Frontend" cmd /k "cd /d "%~dp0frontend" && echo. && echo  App: http://localhost:5173 && echo  Press Ctrl+C to stop. && echo. && npm run dev"

echo.
echo  ✓ Both servers are starting in separate windows.
echo  ✓ Open http://localhost:5173 in your browser.
echo.
echo  (Close the two terminal windows to stop the servers.)
echo.
pause
