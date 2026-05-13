import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';
import fs from 'fs/promises';
import path from 'path';
import { createMediaStructure } from '../../../../tools/createMediaStructure';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const sessionCookie = cookies.get('pocket_session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });

  const session = await verifySession(sessionCookie);
  if (!session || !session.roles.includes('artist')) {
    return new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const albumId = formData.get('albumId') as string;
  const files = formData.getAll('audioFiles') as File[];

  if (!albumId || files.length === 0) {
    return new Response('Album ID and files are required', { status: 400 });
  }

  try {
    // 1. Verify Album Ownership
    const albumRes = await query(`SELECT id, title FROM albums WHERE id = $1 AND artist_human_id = $2`, [albumId, session.humanId]);
    if (albumRes.rows.length === 0) {
      return new Response('Album not found or unauthorized', { status: 403 });
    }

    // 2. Prepare Directory Structure
    const artistResult = await query(`SELECT stage_name FROM artists WHERE human_id = $1`, [session.humanId]);
    const stageName = artistResult.rows[0].stage_name;
    const humanIdShort = session.humanId.split('-')[0];

    const { success, privateMediaPath } = await createMediaStructure({
      humanIdShort,
      stageName
    });

    if (!success || !privateMediaPath) {
      throw new Error('Failed to prepare media directories');
    }

    // 3. Get Current Max Track Number
    const trackNumRes = await query(`SELECT MAX(track_number) as max_track FROM album_songs WHERE album_id = $1`, [albumId]);
    let currentTrackNumber = (trackNumRes.rows[0].max_track || 0) + 1;

    // 4. Process Each File
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const artistPrefix = `${humanIdShort}-${stageName.replace(/[^a-zA-Z0-9]/g, '')}`;

    for (const file of files) {
      if (!file.name || file.size === 0) continue;

      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '); // Strip extension and underscores for title
      const timestamp = Date.now();
      const masterFilename = `${timestamp}_${sanitizeFilename(file.name)}`;
      const masterPath = path.join(privateMediaPath, 'products', 'music', 'masters', masterFilename);
      
      // Save to disk
      await fs.writeFile(masterPath, Buffer.from(await file.arrayBuffer()));
      const dbMasterPath = `artists/${artistPrefix}/products/music/masters/${masterFilename}`;

      // Insert Song
      const songResult = await query(
        `INSERT INTO songs (artist_human_id, title, master_audio_path, individual_price_cents) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [session.humanId, title, dbMasterPath, 99] // Default $0.99 for individually uploaded tracks
      );

      const songId = songResult.rows[0].id;

      // Link to Album
      await query(
        `INSERT INTO album_songs (album_id, song_id, track_number) VALUES ($1, $2, $3)`,
        [albumId, songId, currentTrackNumber]
      );

      currentTrackNumber++;
    }

    return redirect(`/artist/albums/${albumId}/tracks`);
  } catch (err: any) {
    console.error('Bulk upload error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};
