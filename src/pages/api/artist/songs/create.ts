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
    const priceCents = parseInt(formData.get('priceCents')?.toString() || '99', 10);
    const genre = formData.get('genre')?.toString() || null;
    const bpm = formData.get('bpm') ? parseInt(formData.get('bpm')!.toString(), 10) : null;
    const duration = formData.get('duration') ? parseInt(formData.get('duration')!.toString(), 10) : null;
    const isrc = formData.get('isrc')?.toString() || null;
    const isExplicit = formData.get('isExplicit') === 'true';

    if (!title) {
      return new Response('Title is required', { status: 400 });
    }

    // Insert the song into the database
    await query(`
      INSERT INTO songs (artist_human_id, title, individual_price_cents, genre, bpm, duration_seconds, isrc, is_explicit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      session.humanId, 
      title, 
      priceCents, 
      genre, 
      bpm, 
      duration, 
      isrc, 
      isExplicit
    ]);

    // Break out of turbo-frame and reload dashboard
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
