@echo off
setlocal enabledelayedexpansion

:: Set the target directory to the first argument passed to the script.
:: If no argument is passed, default to the current directory where the script is run.
set "TargetDirectory=%~1"
if "%TargetDirectory%"=="" set "TargetDirectory=%CD%"

:: Verify the provided directory exists
if not exist "%TargetDirectory%\" (
    echo [ERROR] The directory "%TargetDirectory%" does not exist. Please check the path.
    pause
    exit /b
)

:: Define and create the output directory inside the target folder
set "OutputDir=%TargetDirectory%\previews"
if not exist "%OutputDir%" mkdir "%OutputDir%"

echo Scanning "%TargetDirectory%"...

:: Check if there are any MP3 files in the directory
dir /b "%TargetDirectory%\*.mp3" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] No MP3 files found in the specified directory.
    pause
    exit /b
)

echo Generating 30-second previews with metadata...
echo --------------------------------------------------

:: Loop through each MP3 file and run FFmpeg
for %%F in ("%TargetDirectory%\*.mp3") do (
    echo Processing: %%~nxF
    
    :: The FFmpeg command preserving metadata and cover art
    ffmpeg -loglevel error -y -i "%%F" -ss 00:00:15 -t 30 -map 0 -map_metadata 0 -c copy -id3v2_version 3 "%OutputDir%\%%~nF_preview.mp3"
)

echo --------------------------------------------------
echo Process complete. Previews are saved in:
echo "%OutputDir%"
pause