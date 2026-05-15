import type { APIRoute } from 'astro';
import { query } from '../../../server/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const { rows } = await query('SELECT * FROM events ORDER BY start_time ASC');
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { title, description, type, start_time, end_time, venue_id, group_id, metadata } = body;
    
    const { rows } = await query(
      `INSERT INTO events (title, description, type, start_time, end_time, venue_id, group_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, type, start_time, end_time, venue_id, group_id, metadata || {}]
    );

    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return new Response(JSON.stringify({ error: 'Failed to create event' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
