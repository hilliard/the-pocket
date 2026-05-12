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
    const albumType = formData.get('albumType')?.toString() || 'album';
    const priceCents = parseInt(formData.get('priceCents')?.toString() || '0', 10);
    const genre = formData.get('genre')?.toString() || null;
    const coverArt = formData.get('coverArt') as File | null;

    if (!title || !coverArt) {
      return new Response('Album title and cover artwork are required', { status: 400 });
    }

    // Get artist info to scaffold folders
    const artistResult = await query(`SELECT stage_name FROM artists WHERE human_id = $1`, [session.humanId]);
    if (artistResult.rows.length === 0) return new Response('Artist not found', { status: 404 });
    const stageName = artistResult.rows[0].stage_name;
    const humanIdShort = session.humanId.split('-')[0];

    // Scaffold folder structure (we pass albumTitle to generate album-specific folders if needed)
    const { success, publicMediaPath } = await createMediaStructure({
      humanIdShort,
      stageName,
      albumTitle: title
    });

    if (!success || !publicMediaPath) {
      return new Response('Failed to prepare media directories', { status: 500 });
    }

    // Save cover art to disk
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const timestamp = Date.now();
    const coverFilename = `${timestamp}_${sanitizeFilename(coverArt.name)}`;
    
    // Album covers are public, store them in products/photos/low_res (or similar)
    const destPath = path.join(publicMediaPath, 'products', 'photos', 'low_res', coverFilename);
    await fs.writeFile(destPath, Buffer.from(await coverArt.arrayBuffer()));

    const artistPrefix = `${humanIdShort}-${stageName.replace(/[^a-zA-Z0-9]/g, '')}`;
    const coverUrl = `/media_assets/artists/${artistPrefix}/products/photos/low_res/${coverFilename}`;

    // Insert the album into the database and capture the ID
    const insertResult = await query(`
      INSERT INTO albums (artist_human_id, title, album_type, price_cents, genre, cover_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      session.humanId, 
      title, 
      albumType,
      priceCents, 
      genre, 
      coverUrl
    ]);

    const newAlbumId = insertResult.rows[0].id;

    // Redirect directly into the Track Builder for this specific album!
    return redirect(`/artist/albums/${newAlbumId}/tracks`);

  } catch (err) {
    console.error('[ARTIST ALBUM CREATE ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
