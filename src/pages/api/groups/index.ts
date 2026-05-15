import type { APIRoute } from 'astro';
import { query } from '../../../server/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const { rows } = await query('SELECT * FROM expense_groups ORDER BY created_at DESC');
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, created_by } = body;
    
    const { rows } = await query(
      `INSERT INTO expense_groups (name, created_by) VALUES ($1, $2) RETURNING *`,
      [name, created_by]
    );

    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return new Response(JSON.stringify({ error: 'Failed to create group' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
