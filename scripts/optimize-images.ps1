param(
  [Parameter(Mandatory = $false, Position = 0)]
  [string]$TargetDirectory = ".\public\media_assets\artists"
)

# Verify the provided directory exists
if (-not (Test-Path -Path $TargetDirectory)) {
  Write-Error "The directory '$TargetDirectory' does not exist. Please check the path and try again."
  exit
}

# Find all PNG and JPG files
$imageFiles = Get-ChildItem -Path $TargetDirectory -Include *.png, *.jpg, *.jpeg -Recurse -File

Write-Host "Scanning '$TargetDirectory' for unoptimized images..." -ForegroundColor Yellow

if ($imageFiles.Count -eq 0) {
  Write-Host "No image files found in the specified directory." -ForegroundColor Red
  exit
}

Write-Host "Found $($imageFiles.Count) images. Converting to optimized JPGs (max 1024px width)..." -ForegroundColor Cyan

foreach ($file in $imageFiles) {
  $inputFile = $file.FullName
  
  # Skip files that are already marked as optimized to avoid double-processing
  if ($file.Name -match "_optimized") {
      continue
  }

  $outputFile = Join-Path -Path $file.DirectoryName -ChildPath ($file.BaseName + "_optimized.jpg")
    
  Write-Host "Processing: $($file.Name) -> $(Split-Path $outputFile -Leaf)"
    
  # Use FFmpeg to convert to JPG, reduce quality slightly for web optimization (-q:v 2-5 is good), 
  # and scale down to a max width of 1024px (height auto-scales to maintain aspect ratio)
  ffmpeg -loglevel error -y -i "$inputFile" -vf "scale='min(1024,iw)':-1" -q:v 3 "$outputFile"
  
  # Note: The original files are kept safe. 
  # You can manually delete the old .png files once you've updated your database to point to the new _optimized.jpg files!
}

Write-Host "Process complete! Optimized images are saved alongside the originals." -ForegroundColor Green
