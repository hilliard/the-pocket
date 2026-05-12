import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';

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
    const coverUrl = formData.get('coverUrl')?.toString() || null;

    if (!title) {
      return new Response('Album title is required', { status: 400 });
    }

    // Insert the album into the database
    await query(`
      INSERT INTO albums (artist_human_id, title, album_type, price_cents, genre, cover_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      session.humanId, 
      title, 
      albumType,
      priceCents, 
      genre, 
      coverUrl
    ]);

    // Break out of turbo-frame and reload dashboard
    return redirect('/artist/dashboard');

  } catch (err) {
    console.error('[ARTIST ALBUM CREATE ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
