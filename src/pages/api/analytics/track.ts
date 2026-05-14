import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { artist_human_id, event_type, entity_type, entity_id } = data;

    if (!artist_human_id || !event_type) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Generate a pseudo-anonymous visitor ID based on IP and User-Agent
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    // Hash them to preserve privacy while still allowing unique visitor counts
    const visitor_id = crypto.createHash('sha256').update(`${ip}-${userAgent}-${new Date().toISOString().split('T')[0]}`).digest('hex').substring(0, 16);

    const referrer = request.headers.get('referer') || null;

    await query(
      `INSERT INTO analytics_events (artist_human_id, event_type, entity_type, entity_id, visitor_id, referrer) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [artist_human_id, event_type, entity_type || null, entity_id || null, visitor_id, referrer]
    );

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Always return 200 for tracking so we don't block the client
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }
};
