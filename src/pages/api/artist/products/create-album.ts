import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';
import fs from 'fs/promises';
import path from 'path';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');

    const session = await verifySession(sessionCookie);
    if (!session || !session.roles?.includes('artist')) {
      return new Response('Unauthorized', { status: 403 });
    }

    const formData = await request.formData();
    const album_type = formData.get('album_type')?.toString() || 'album';
    const title = formData.get('title')?.toString();
    const priceStr = formData.get('price')?.toString();
    const genre = formData.get('genre')?.toString() || null;
    const coverFile = formData.get('cover_file') as File | null;

    if (!title || !priceStr || !coverFile || !coverFile.name) {
      return new Response('Missing required fields or valid file', { status: 400 });
    }

    const price_cents = Math.round(parseFloat(priceStr) * 100);

    // Get Artist details
    const artistRes = await query('SELECT slug, human_id FROM artists WHERE human_id = $1', [session.humanId]);
    if (artistRes.rows.length === 0) return new Response('Artist not found', { status: 404 });
    const artist = artistRes.rows[0];

    // Generate a new ID for the album
    const albumRes = await query('SELECT gen_random_uuid() as new_id');
    const albumId = albumRes.rows[0].new_id;

    const artistFolder = `${artist.human_id.split('-')[0]}-${artist.slug}`;

    // Build directory structures for the cover image
    const ext = path.extname(coverFile.name).toLowerCase() || '.jpg';
    const coverDir = path.join(process.cwd(), 'public', 'media_assets', 'artists', artistFolder, 'products', 'music', 'covers');
    await fs.mkdir(coverDir, { recursive: true });

    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const coverFilename = `${albumId}_${safeTitle}${ext}`;
    const coverPath = path.join(coverDir, coverFilename);

    // Save Cover File
    const arrayBuffer = await coverFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(coverPath, buffer);

    // Determine the database URL
    const coverDbPath = `/media_assets/artists/${artistFolder}/products/music/covers/${coverFilename}`;

    // Insert into DB
    await query(`
      INSERT INTO albums (id, artist_human_id, title, album_type, price_cents, genre, cover_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [albumId, artist.human_id, title, album_type, price_cents, genre, coverDbPath]);

    cookies.set('pocket_flash', `${album_type === 'ep' ? 'EP' : 'Album'} created! Now add your tracks.`, { path: '/' });
    
    // Redirect directly to the Track Manager so they can upload their music
    return redirect(`/artist/albums/${albumId}/tracks`);

  } catch (error) {
    console.error('Error creating album:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
