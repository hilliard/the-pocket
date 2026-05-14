import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import { eventBus } from '../../../server/events';

export const POST: APIRoute = async ({ request }) => {
  // Setup CORS headers so the form can be embedded anywhere
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const data = await request.formData();
    const email = data.get('email')?.toString();
    const artist_human_id = data.get('artist_human_id')?.toString();

    if (!email || !artist_human_id) {
      return new Response(JSON.stringify({ error: 'Missing email or artist ID' }), { status: 400, headers });
    }

    // Insert subscriber into database (ON CONFLICT DO NOTHING so we don't throw an error if they are already subscribed)
    await query(
      `INSERT INTO subscribers (artist_human_id, email, status) 
       VALUES ($1, $2, 'subscribed') 
       ON CONFLICT (artist_human_id, email) DO UPDATE SET status = 'subscribed'`,
      [artist_human_id, email.toLowerCase()]
    );

    // Emit a Server-Sent Event (SSE) so the dashboard updates in real-time!
    eventBus.emit(`subscriber_added_${artist_human_id}`, {
      email: email.toLowerCase(),
      status: 'subscribed',
      created_at: new Date().toISOString()
    });

    // If it's a standard HTML form submission (like from the Hub), redirect back
    if (request.headers.get('accept')?.includes('text/html')) {
      const referer = request.headers.get('referer');
      if (referer) {
        return new Response(null, {
          status: 302,
          headers: new Headers({ ...headers, Location: `${referer}?subscribed=true` })
        });
      }
    }

    // Otherwise, return JSON (for AJAX embeds)
    return new Response(JSON.stringify({ success: true, message: 'Subscribed successfully!' }), { 
      status: 200, 
      headers 
    });

  } catch (err: any) {
    console.error('Subscription error:', err);
    return new Response(JSON.stringify({ error: 'Failed to subscribe' }), { status: 500, headers });
  }
};
