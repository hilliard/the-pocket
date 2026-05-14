import type { APIRoute } from 'astro';
import { verifySession } from '../../../server/auth';
import { query } from '../../../server/db';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');
    
    const session = await verifySession(sessionCookie);
    if (!session || !session.roles.includes('artist')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const content = formData.get('content')?.toString() || '';
    
    if (!content.trim()) {
      return new Response('Content cannot be empty', { status: 400 });
    }

    // Insert post into database
    await query(
      `INSERT INTO artist_posts (artist_human_id, content) VALUES ($1, $2)`,
      [session.humanId, content.trim()]
    );

    // Redirect back to artist dashboard
    return redirect('/artist/dashboard');

  } catch (err: any) {
    console.error('[ARTIST POST ERROR]:', err);
    return new Response(`Error saving post: ${err.message}`, { status: 500 });
  }
};
