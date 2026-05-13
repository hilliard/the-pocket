param(
  [Parameter(Mandatory = $false, Position = 0)]
  [string]$TargetDirectory = $PWD.Path
)

# Verify the provided directory exists
if (-not (Test-Path -Path $TargetDirectory)) {
  Write-Error "The directory '$TargetDirectory' does not exist. Please check the path and try again."
  exit
}

# Define and create the output directory inside the target folder
$outputDir = Join-Path -Path $TargetDirectory -ChildPath "previews"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# Find all MP3 files in the target folder
$mp3Files = Get-ChildItem -Path $TargetDirectory -Filter *.mp3 -File

Write-Host "Scanning '$TargetDirectory'..." -ForegroundColor Yellow

if ($mp3Files.Count -eq 0) {
  Write-Host "No MP3 files found in the specified directory." -ForegroundColor Red
  exit
}

Write-Host "Found $($mp3Files.Count) tracks. Generating 30-second previews with metadata..." -ForegroundColor Cyan

# Loop through each track and run FFmpeg
foreach ($file in $mp3Files) {
  $inputFile = $file.FullName
  $outputFile = Join-Path -Path $outputDir -ChildPath ($file.BaseName + "_preview.mp3")
    
  Write-Host "Processing: $($file.Name)"
    
  # The updated FFmpeg command preserving all metadata and cover art
  ffmpeg -loglevel error -y -i "$inputFile" -ss 00:00:15 -t 30 -map 0 -map_metadata 0 -c copy -id3v2_version 3 "$outputFile"
}

Write-Host "Process complete. Previews are saved in '$outputDir'." -ForegroundColor Green