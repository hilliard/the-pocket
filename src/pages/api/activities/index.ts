import type { APIRoute } from 'astro';
import { query } from '../../../server/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { event_id, title, start_time, end_time, location_name, sequence_order, metadata } = body;
    
    const { rows } = await query(
      `INSERT INTO activities (event_id, title, start_time, end_time, location_name, sequence_order, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [event_id, title, start_time, end_time, location_name, sequence_order || 0, metadata || {}]
    );

    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return new Response(JSON.stringify({ error: 'Failed to create activity' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
