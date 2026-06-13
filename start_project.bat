@echo off
setlocal enabledelayedexpansion

:: Ensure the command runs from the directory containing this batch script
cd /d "%~dp0"

echo ========================================================
echo        GHRCE AI Timetable - Setup and Startup Script
echo ========================================================
echo.

:: 1. Verify and set up Python backend environment
echo [1/3] Checking Backend Python Environment...
if not exist "backend" (
    echo [ERROR] Backend directory not found in: %cd%
    pause
    exit /b 1
)

cd backend

if not exist "venv" (
    echo [INFO] Virtual environment 'venv' not found in backend directory. Creating 'venv'...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment. Please ensure Python is installed and in your PATH.
        pause
        exit /b 1
    )
    echo [INFO] Installing backend dependencies from requirements.txt...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install backend requirements.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Backend virtual environment found.
)

cd ..
echo.

:: 2. Verify and set up React frontend environment
echo [2/3] Checking Frontend Node Modules...
if not exist "frontend" (
    echo [ERROR] Frontend directory not found in: %cd%
    pause
    exit /b 1
)

cd frontend

if not exist "node_modules" (
    echo [INFO] frontend/node_modules not found. Installing node packages...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed. Please ensure Node.js/NPM is installed and in your PATH.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Frontend node_modules found.
)

cd ..
echo.

:: 3. Launch both servers
echo [3/3] Starting Servers in separate windows...

echo Starting Backend Server (FastAPI)...
start "Backend Server" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload"

echo Starting Frontend Server (React)...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo Both servers are launching in separate command prompt windows!
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo.
pause

