# SOP: Media Assets Management

## Goal
To predictably scaffold and manage physical media asset directories (audio, images, videos) on the filesystem whenever an artist creates a new product (album/song).

## Inputs
1. **Artist Entity**: `human_id`, `slug`, `stage_name`
2. **Product Metadata**: `album title`, `song title`, `track number`

## Execution Logic (The "Happy Path")
1. An artist submits a new album/track via the dashboard.
2. The system queries the `artists` table to resolve their unique folder prefix (e.g., `<human_id_short>-<stage_name_no_spaces>`).
3. The server ensures the base artist hierarchy exists:
   - `/media_assets/artists/<prefix>/profile`
   - `/media_assets/artists/<prefix>/products/music/masters/`
   - `/media_assets/artists/<prefix>/products/photos/`
   - `/media_assets/artists/<prefix>/products/videos/`
4. For the specific album, a subdirectory is created: `/products/music/masters/<Album Title>/`.
5. The uploaded audio file is sanitized and saved as `<track_number>-<song_title_slug>.mp3`.
6. The resulting absolute or relative `media_asset_path` is written to the `songs` table in Postgres.

## Edge Cases & Error Handling
- **Sanitization**: All folder and file names must be sanitized (removing special characters, `&`, etc.) to prevent routing/filesystem errors.
- **File System Permissions**: Ensure the Node/Astro process has write access to the `media_assets` directory.
- **Duplicate Files**: If a file exists, append a timestamp or hash to the filename before saving to prevent overwrites.
