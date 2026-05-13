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
    const title = formData.get('title')?.toString();
    const priceStr = formData.get('price')?.toString();
    const genre = formData.get('genre')?.toString() || null;
    const audioFile = formData.get('audio_file') as File | null;

    if (!title || !priceStr || !audioFile || !audioFile.name) {
      return new Response('Missing required fields or valid file', { status: 400 });
    }

    const price_cents = Math.round(parseFloat(priceStr) * 100);

    // Get Artist details
    const artistRes = await query('SELECT slug, human_id FROM artists WHERE human_id = $1', [session.humanId]);
    if (artistRes.rows.length === 0) return new Response('Artist not found', { status: 404 });
    const artist = artistRes.rows[0];

    // Generate a new ID for the song
    const songRes = await query('SELECT gen_random_uuid() as new_id');
    const songId = songRes.rows[0].new_id;

    // Build directory structures
    const ext = path.extname(audioFile.name).toLowerCase() || '.mp3';
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

    // 1. Save Master File
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(masterPath, buffer);

    // 2. Generate Preview with FFmpeg (Fade in/out, 30s)
    const ffmpegCommand = `ffmpeg -loglevel error -y -ss 00:00:15 -i "${masterPath}" -t 30 -af "afade=t=in:st=0:d=1.5,afade=t=out:st=28.5:d=1.5" -map 0:a? -map_metadata 0 -b:a 192k -id3v2_version 3 "${previewPath}"`;
    
    let previewDbPath = null;
    try {
      await execAsync(ffmpegCommand);
      previewDbPath = `/media_assets/artists/${artistFolder}/products/music/previews/${previewFilename}`;
    } catch (ffmpegErr) {
      console.error("FFmpeg failed to generate preview. Is ffmpeg in PATH?", ffmpegErr);
      // We will still proceed, the song will just have no preview url
    }

    // 3. Insert into DB
    await query(`
      INSERT INTO songs (id, artist_human_id, title, individual_price_cents, genre, preview_audio_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [songId, artist.human_id, title, price_cents, genre, previewDbPath]);

    // 4. Track Master File in media_files
    const masterDbPath = `/artists/${artistFolder}/products/music/masters/${masterFilename}`;
    await query(`
      INSERT INTO media_files (entity_type, entity_id, file_path, file_format, mime_type)
      VALUES ('song', $1, $2, $3, $4)
    `, [songId, masterDbPath, ext.replace('.', ''), audioFile.type || 'audio/mpeg']);

    cookies.set('pocket_flash', 'Single uploaded and processing complete!', { path: '/' });
    return redirect('/artist/dashboard');

  } catch (error) {
    console.error('Error uploading song:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
