# Define and create the output directory for the preview files
$outputDir = "previews"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# Find all MP3 files in the current folder (excluding the previews folder)
$mp3Files = Get-ChildItem -Filter *.mp3 -File

Write-Host "Found $($mp3Files.Count) tracks. Generating 30-second previews..." -ForegroundColor Cyan

# Loop through each track and run FFmpeg
foreach ($file in $mp3Files) {
  $inputFile = $file.FullName
  $outputFile = Join-Path -Path $outputDir -ChildPath ($file.BaseName + "_preview.mp3")
    
  Write-Host "Processing: $($file.Name)"
    
  # The FFmpeg command:
  # -ss 00:00:15 skips the first 15 seconds (often a good idea to bypass slow intros)
  # -t 30 extracts exactly 30 seconds
  # -c copy ensures zero quality loss and instant processing
  # -y automatically overwrites if the file already exists
  ffmpeg -loglevel error -y -i "$inputFile" -ss 00:00:15 -t 30 -c copy "$outputFile"
}

Write-Host "Process complete. Previews are saved in the '\$outputDir' directory." -ForegroundColor Green