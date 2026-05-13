import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');

    const session = await verifySession(sessionCookie);
    if (!session || !session.roles?.includes('artist')) {
      return new Response('Unauthorized', { status: 403 });
    }

    const formData = await request.formData();
    const albumId = formData.get('albumId')?.toString();
    const audioFiles = formData.getAll('audioFiles') as File[];

    if (!albumId || audioFiles.length === 0) {
      return new Response('Missing required fields or valid files', { status: 400 });
    }

    // Verify album ownership
    const albumRes = await query('SELECT id FROM albums WHERE id = $1 AND artist_human_id = $2', [albumId, session.humanId]);
    if (albumRes.rows.length === 0) return new Response('Album not found or unauthorized', { status: 403 });

    // Get Artist details
    const artistRes = await query('SELECT slug, human_id FROM artists WHERE human_id = $1', [session.humanId]);
    const artist = artistRes.rows[0];

    // Get current track number offset
    const trackCountRes = await query('SELECT COUNT(*) as count FROM album_songs WHERE album_id = $1', [albumId]);
    let nextTrackNumber = parseInt(trackCountRes.rows[0].count) + 1;

    // Process each file sequentially
    for (const file of audioFiles) {
      if (!file.name) continue;

      const title = file.name.replace(/\.[^/.]+$/, ""); // Use filename without extension as title

      // Generate a new ID for the song
      const songRes = await query('SELECT gen_random_uuid() as new_id');
      const songId = songRes.rows[0].new_id;

      // Build directory structures
      const ext = path.extname(file.name).toLowerCase() || '.mp3';
      const artistFolder = `${artist.human_id.split('-')[0]}-${artist.slug}`;
      const masterDir = path.join(process.cwd(), 'private_assets', 'artists', artistFolder, 'products', 'music', 'masters');
      const previewDir = path.join(process.cwd(), 'public', 'media_assets', 'artists', artistFolder, 'products', 'music', 'previews');
      
      await fs.mkdir(masterDir, { recursive: true });
      await fs.mkdir(previewDir, { recursive: true });

      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const masterFilename = `${songId}_${safeTitle}${ext}`;
      const previewFilename = `${songId}_${safeTitle}_preview.mp3`;

      const masterPath = path.join(masterDir, masterFilename);
      const previewPath = path.join(previewDir, previewFilename);

      // Save Master File
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(masterPath, buffer);

      // Generate Preview with FFmpeg
      const ffmpegCommand = `ffmpeg -loglevel error -y -ss 00:00:15 -i "${masterPath}" -t 30 -af "afade=t=in:st=0:d=1.5,afade=t=out:st=28.5:d=1.5" -map 0:a? -map_metadata 0 -b:a 192k -id3v2_version 3 "${previewPath}"`;
      
      let previewDbPath = null;
      try {
        await execAsync(ffmpegCommand);
        previewDbPath = `/media_assets/artists/${artistFolder}/products/music/previews/${previewFilename}`;
      } catch (ffmpegErr) {
        console.error(`FFmpeg failed to generate preview for ${file.name}.`, ffmpegErr);
      }

      // Insert into DB
      await query(`
        INSERT INTO songs (id, artist_human_id, title, individual_price_cents, preview_audio_url)
        VALUES ($1, $2, $3, 99, $4)
      `, [songId, artist.human_id, title, previewDbPath]);

      // Bridge song to album
      await query(`
        INSERT INTO album_songs (album_id, song_id, track_number)
        VALUES ($1, $2, $3)
      `, [albumId, songId, nextTrackNumber]);

      // Track Master File
      const masterDbPath = `/artists/${artistFolder}/products/music/masters/${masterFilename}`;
      await query(`
        INSERT INTO media_files (entity_type, entity_id, file_path, file_format, mime_type)
        VALUES ('song', $1, $2, $3, $4)
      `, [songId, masterDbPath, ext.replace('.', ''), file.type || 'audio/mpeg']);

      nextTrackNumber++;
    }

    cookies.set('pocket_flash', 'Bulk upload complete! Tracks added.', { path: '/' });
    
    // Redirect back to the tracks manager modal
    return redirect(`/artist/albums/${albumId}/tracks`);

  } catch (error) {
    console.error('Error in bulk upload:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
