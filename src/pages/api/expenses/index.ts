import type { APIRoute } from 'astro';
import { query, getClient } from '../../../server/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const { rows } = await query('SELECT * FROM expenses ORDER BY created_at DESC');
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, redirect }) => {
  const client = await getClient();
  try {
    let event_id, activity_id, group_id, amount_cents, category, description, paid_by;
    let splits = null;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      event_id = body.event_id;
      activity_id = body.activity_id;
      group_id = body.group_id;
      amount_cents = body.amount_cents;
      category = body.category;
      description = body.description;
      paid_by = body.paid_by;
      splits = body.splits;
    } else {
      // Handle standard form data (from Astro/Turbo UI)
      const formData = await request.formData();
      event_id = formData.get('event_id') || null;
      activity_id = formData.get('activity_id') || null;
      group_id = formData.get('group_id') || null;
      const rawAmount = formData.get('amount')?.toString() || '0';
      amount_cents = Math.round(parseFloat(rawAmount) * 100);
      category = formData.get('category')?.toString();
      description = formData.get('description')?.toString();
      paid_by = formData.get('paid_by')?.toString();
      // Complex splits from form data can be handled later if needed
    }
    
    await client.query('BEGIN');

    // Insert expense
    const expenseRes = await client.query(
      `INSERT INTO expenses (event_id, activity_id, group_id, amount_cents, category, description, paid_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [event_id, activity_id, group_id, amount_cents, category, description, paid_by]
    );
    
    const expense = expenseRes.rows[0];

    // Insert splits if provided
    if (splits && Array.isArray(splits)) {
      for (const split of splits) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, human_id, amount_cents) VALUES ($1, $2, $3)`,
          [expense.id, split.human_id, split.amount_cents]
        );
      }
    }

    await client.query('COMMIT');

    // If it was a form submission, redirect back to dashboard
    if (!contentType.includes('application/json')) {
       return redirect('/artist/dashboard', 303);
    }

    return new Response(JSON.stringify(expense), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating expense:', error);
    return new Response(JSON.stringify({ error: 'Failed to create expense' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    client.release();
  }
};
