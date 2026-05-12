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
    // Verify the song belongs to this artist
    const verifyResult = await query(
      `SELECT id FROM songs WHERE id = $1 AND artist_human_id = $2`,
      [id, session.humanId]
    );

    if (verifyResult.rows.length === 0) {
      return new Response('Song not found or unauthorized', { status: 404 });
    }

    // Delete the song
    // (Note: this deletes the DB record. For a production app, we would also want to trigger an async job to delete the physical files from the media_assets folders to save disk space.)
    await query(`DELETE FROM songs WHERE id = $1`, [id]);

    return redirect('/artist/dashboard');
  } catch (err) {
    console.error('[DELETE SONG ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
