@echo off
REM Lets `make <target>` work on Windows without installing GNU make.
REM Forwards to make.ps1 (bypassing execution policy).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" %*
