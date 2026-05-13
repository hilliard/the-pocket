#!/bin/bash

# Set target directory to the first argument passed. If empty, default to current directory.
TARGET_DIR="${1:-$(pwd)}"

# Verify the provided directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "\033[0;31m[ERROR] The directory '$TARGET_DIR' does not exist. Please check the path.\033[0m"
    exit 1
fi

# Define and create the output directory inside the target folder
OUTPUT_DIR="$TARGET_DIR/previews"
mkdir -p "$OUTPUT_DIR"

echo -e "\033[1;33mScanning '$TARGET_DIR'...\033[0m"

# Enable nullglob so the loop doesn't break if no mp3s are found
shopt -s nullglob
mp3_files=("$TARGET_DIR"/*.mp3)

if [ ${#mp3_files[@]} -eq 0 ]; then
    echo -e "\033[0;31m[WARNING] No MP3 files found in the specified directory.\033[0m"
    exit 1
fi

echo -e "\033[1;36mFound ${#mp3_files[@]} tracks. Generating 30-second previews with metadata...\033[0m"
echo "--------------------------------------------------"

# Loop through each MP3 file and run FFmpeg
for file in "${mp3_files[@]}"; do
    # Extract just the filename without the path
    filename=$(basename "$file")
    # Extract the name without the .mp3 extension
    basename="${filename%.*}"
    
    echo "Processing: $filename"
    
    # The FFmpeg command preserving metadata and cover art
    ffmpeg -loglevel error -y -i "$file" -ss 00:00:15 -t 30 -map 0 -map_metadata 0 -c copy -id3v2_version 3 "$OUTPUT_DIR/${basename}_preview.mp3"
done

echo "--------------------------------------------------"
echo -e "\033[1;32mProcess complete. Previews are saved in:\033[0m"
echo "$OUTPUT_DIR"