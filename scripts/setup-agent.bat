@echo off
REM Navigate to the agent directory
cd /d "%~dp0\..\agent" 2>nul
if errorlevel 1 (
    echo [setup-agent] No agent directory found, skipping agent setup.
    exit /b 0
)

uv sync
