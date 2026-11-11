@echo off
REM ===========================================================================
REM  start.cmd  --  Double-click to launch the review site (Windows)
REM
REM  Local   : http://127.0.0.1:8080/
REM  Network : http://<your-ip>:8080/
REM
REM  This file is intentionally pure ASCII so cmd.exe can never mangle it.
REM  Optional:  start.cmd 9000     to force a port number
REM ===========================================================================
setlocal
cd /d "%~dp0"

set "PORT=8080"
if not "%~1"=="" set "PORT=%~1"

echo.
echo   Starting review site...
echo.

where python >nul 2>nul
if errorlevel 1 goto NOPYTHON

python "%~dp0tools\serve.py" --port %PORT%
if errorlevel 1 goto FAILED
goto END

:NOPYTHON
echo   [ERROR] python not found. Install Python 3, or add it to PATH.
echo.
pause
exit /b 1

:FAILED
echo.
echo   [NOTE] The server exited with an error.
echo          Common causes:
echo            1. Port %PORT% is already in use - try:   start.cmd 8081
echo            2. Python is installed but broken
echo.
pause
exit /b 1

:END
endlocal
