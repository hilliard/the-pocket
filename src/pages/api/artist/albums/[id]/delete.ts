import type { APIRoute } from 'astro';
import { query } from '../../../../../server/db';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
  // @ts-ignore
  const session = locals.session;
  if (!session?.roles?.includes('artist')) {
    return new Response('Forbidden', { status: 403 });
  }

  const { id } = params;

  try {
    // Verify the album belongs to this artist
    const verifyResult = await query(
      `SELECT id FROM albums WHERE id = $1 AND artist_human_id = $2`,
      [id, session.humanId]
    );

    if (verifyResult.rows.length === 0) {
      return new Response('Album not found or unauthorized', { status: 404 });
    }

    // Delete the album
    // (Note: album_songs records will automatically CASCADE delete)
    await query(`DELETE FROM albums WHERE id = $1`, [id]);

    return redirect('/artist/dashboard');
  } catch (err) {
    console.error('[DELETE ALBUM ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
