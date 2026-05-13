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
    
    # Premium FFmpeg Pipeline:
    # 1. Cuts exactly 30 seconds starting at 00:15
    # 2. Applies a 1.5-second fade in at the start, and a 1.5-second fade out at the end
    # 3. Preserves all metadata and cover art (-map 0 -map_metadata 0)
    # 4. Standardizes the output to 192k bitrate
    ffmpeg -loglevel error -y -ss 00:00:15 -i "$file" -t 30 -af "afade=t=in:st=0:d=1.5,afade=t=out:st=28.5:d=1.5" -map 0:a? -map 0:v? -map_metadata 0 -c:v copy -b:a 192k -id3v2_version 3 "$OUTPUT_DIR/${basename}_preview.mp3"
done

echo "--------------------------------------------------"
echo -e "\033[1;32mProcess complete. Previews are saved in:\033[0m"
echo "$OUTPUT_DIR"