import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import { verifySession } from '../../../server/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const sessionCookie = cookies.get('pocket_session')?.value;
  if (!sessionCookie) return redirect('/login');

  const session = await verifySession(sessionCookie);
  if (!session || !session.roles.includes('artist')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get('title')?.toString();
  const event_date = formData.get('event_date')?.toString();
  const venue = formData.get('venue')?.toString();
  const ticket_url = formData.get('ticket_url')?.toString();

  if (!title || !event_date || !venue) {
    return new Response('Missing required fields', { status: 400 });
  }

  try {
    await query(
      `INSERT INTO artist_events (artist_human_id, title, event_date, venue, ticket_url) 
       VALUES ($1, $2, $3, $4, $5)`,
      [session.humanId, title, event_date, venue, ticket_url || null]
    );

    // Redirect back to dashboard after posting
    return redirect('/artist/dashboard?event_posted=true');
  } catch (error) {
    console.error('Error posting event:', error);
    return new Response('Failed to post event', { status: 500 });
  }
};
