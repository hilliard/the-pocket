======================================================
GoldTending Audio Preview Tools
======================================================

Welcome! This toolkit contains lightweight scripts designed to help you quickly generate 30-second preview clips of your music for the web. 

These tools will process an entire folder of MP3s in seconds. They do not alter your original files, they preserve all your audio quality, and they keep your album artwork and track metadata intact.

------------------------------------------------------
PREREQUISITE: You Need FFmpeg
------------------------------------------------------
To run these lightning-fast audio cuts, your computer needs a free, industry-standard tool called FFmpeg. 

* Windows: 
  Download the latest essential build from https://gyan.dev/ffmpeg/builds/ 
  Extract the folder, and make sure the 'ffmpeg.exe' file is accessible (either in your system PATH, or just drop a copy of 'ffmpeg.exe' right into the folder with your music).

* Mac: 
  The easiest way to install is via Homebrew. Open your Terminal and type:
  brew install ffmpeg

* Linux (Ubuntu/Debian): 
  Open your terminal and type:
  sudo apt install ffmpeg

------------------------------------------------------
HOW TO USE (WINDOWS)
------------------------------------------------------
Method 1: The Easy Drag-and-Drop (Using the .bat file)
1. Unzip these tools.
2. Find the folder containing the MP3s you want to process (e.g., "My Album").
3. Click and drag that folder icon directly on top of the "prepare-previews.bat" file.
4. A black window will appear, process your files, and tell you when it's done.

Method 2: Command Line (Using the .ps1 file)
If you prefer PowerShell:
1. Open PowerShell.
2. Type: .\prepare-previews.ps1 "C:\Path\To\Your\Album\Folder"
3. Hit Enter.

------------------------------------------------------
HOW TO USE (MAC & LINUX)
------------------------------------------------------
1. Open your Terminal.
2. You must first give the script permission to run. Type the following and hit enter:
   chmod +x /path/to/prepare-previews.sh
3. Run the script and point it to your music folder by typing:
   /path/to/prepare-previews.sh "/path/to/your/album/folder"

Note: Make sure to keep the quote marks around your folder path if the folder name contains spaces!

------------------------------------------------------
WHAT TO EXPECT
------------------------------------------------------
When the script finishes, it will create a new folder named "previews" inside your album folder. Inside, you will find perfectly cut, 30-second versions of your songs, skipping the first 15 seconds to get past slow intros. Your original files remain completely untouched.

======================================================