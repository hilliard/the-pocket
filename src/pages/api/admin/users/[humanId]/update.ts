import type { APIRoute } from 'astro';
import { query } from '../../../../../server/db';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  // @ts-ignore
  if (!locals.session?.roles?.includes('admin')) {
    return new Response('Forbidden', { status: 403 });
  }

  const { humanId } = params;
  if (!humanId) return new Response('Missing ID', { status: 400 });

  try {
    const formData = await request.formData();
    const firstName = formData.get('firstName')?.toString() || '';
    const lastName = formData.get('lastName')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const email = formData.get('email')?.toString() || '';

    // 1. Update Human Record
    await query(`
      UPDATE humans 
      SET first_name = $1, last_name = $2, phone = $3
      WHERE id = $4
    `, [firstName, lastName, phone, humanId]);

    // 2. Handle Email History (from admin-usage.md specs)
    if (email) {
      // Get current active email
      const emailResult = await query(`
        SELECT email FROM email_history 
        WHERE human_id = $1 AND effective_to IS NULL
      `, [humanId]);

      const currentEmail = emailResult.rows[0]?.email;

      // If email has changed or is new
      if (email !== currentEmail) {
        // Expire old email
        await query(`
          UPDATE email_history 
          SET effective_to = CURRENT_TIMESTAMP 
          WHERE human_id = $1 AND effective_to IS NULL
        `, [humanId]);

        // Insert new email
        await query(`
          INSERT INTO email_history (human_id, email, is_verified, change_reason)
          VALUES ($1, $2, false, 'admin_updated')
        `, [humanId, email]);
      }
    }

    // Redirect to dashboard (full page reload to reflect changes in background table)
    return redirect('/admin/dashboard');

  } catch (err) {
    console.error('[ADMIN UPDATE ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
