import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import fs from 'fs/promises';
import path from 'path';
import { createMediaStructure } from '../../../../tools/createMediaStructure';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  // @ts-ignore
  const session = locals.session;
  if (!session?.roles?.includes('artist')) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const formData = await request.formData();
    
    const title = formData.get('title')?.toString();
    const priceCents = parseInt(formData.get('priceCents')?.toString() || '99', 10);
    const genre = formData.get('genre')?.toString() || null;
    const bpm = formData.get('bpm') ? parseInt(formData.get('bpm')!.toString(), 10) : null;
    const duration = formData.get('duration') ? parseInt(formData.get('duration')!.toString(), 10) : null;
    const isrc = formData.get('isrc')?.toString() || null;
    const isExplicit = formData.get('isExplicit') === 'true';

    const masterAudio = formData.get('masterAudio') as File | null;
    const previewAudio = formData.get('previewAudio') as File | null;

    if (!title || !masterAudio) {
      return new Response('Title and Master Audio are required', { status: 400 });
    }

    // Get artist info to scaffold folders
    const artistResult = await query(`SELECT stage_name FROM artists WHERE human_id = $1`, [session.humanId]);
    if (artistResult.rows.length === 0) return new Response('Artist not found', { status: 404 });
    const stageName = artistResult.rows[0].stage_name;
    const humanIdShort = session.humanId.split('-')[0];

    // Scaffold/Verify folder structure
    const { success, publicMediaPath, privateMediaPath } = await createMediaStructure({
      humanIdShort,
      stageName
    });

    if (!success || !publicMediaPath || !privateMediaPath) {
      return new Response('Failed to prepare media directories', { status: 500 });
    }

    // Generate safe filenames
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const timestamp = Date.now();
    
    const masterFilename = `${timestamp}_${sanitizeFilename(masterAudio.name)}`;
    const masterPath = path.join(privateMediaPath, 'products', 'music', 'masters', masterFilename);
    await fs.writeFile(masterPath, Buffer.from(await masterAudio.arrayBuffer()));

    const artistPrefix = `${humanIdShort}-${stageName.replace(/[^a-zA-Z0-9]/g, '')}`;
    const masterAudioPath = `artists/${artistPrefix}/products/music/masters/${masterFilename}`;
    
    let previewAudioUrl = null;
    if (previewAudio && previewAudio.size > 0) {
      const previewFilename = `${timestamp}_${sanitizeFilename(previewAudio.name)}`;
      const previewPath = path.join(publicMediaPath, 'products', 'music', 'previews', previewFilename);
      await fs.writeFile(previewPath, Buffer.from(await previewAudio.arrayBuffer()));
      previewAudioUrl = `/media_assets/artists/${artistPrefix}/products/music/previews/${previewFilename}`;
    }

    const albumId = formData.get('albumId')?.toString() || null;

    // Insert the song into the database
    const insertSongResult = await query(`
      INSERT INTO songs (
        artist_human_id, title, individual_price_cents, genre, bpm, duration_seconds, 
        isrc, is_explicit, master_audio_path, preview_audio_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      session.humanId, 
      title, 
      priceCents, 
      genre, 
      bpm, 
      duration, 
      isrc, 
      isExplicit,
      masterAudioPath,
      previewAudioUrl
    ]);

    const newSongId = insertSongResult.rows[0].id;

    // If part of an album, bridge it!
    if (albumId) {
      // Find the next track number
      const trackCountResult = await query(`SELECT COALESCE(MAX(track_number), 0) + 1 as next_track FROM album_songs WHERE album_id = $1`, [albumId]);
      const nextTrack = trackCountResult.rows[0].next_track;

      await query(`
        INSERT INTO album_songs (album_id, song_id, track_number)
        VALUES ($1, $2, $3)
      `, [albumId, newSongId, nextTrack]);

      // Redirect back to the album tracks manager modal
      return redirect(`/artist/albums/${albumId}/tracks`);
    }

    // Break out of turbo-frame and reload dashboard for independent singles
    return redirect('/artist/dashboard');

  } catch (err: any) {
    console.error('[ARTIST SONG CREATE ERROR]:', err);
    // If ISRC is unique violation
    if (err.code === '23505') {
      return new Response('ISRC must be unique', { status: 400 });
    }
    return new Response('Server Error', { status: 500 });
  }
};
