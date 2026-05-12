import type { APIRoute } from 'astro';
import { createSession } from '../../../server/auth';
import { query } from '../../../server/db';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Only allow this in development
  if (import.meta.env.PROD) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const formData = await request.formData();
    const roleType = formData.get('role')?.toString() || 'admin';

    let userResult;

    if (roleType === 'artist') {
      // Find Stevie Wonder
      userResult = await query(
        `SELECT h.id as human_id, a.stage_name as username 
         FROM humans h 
         JOIN artists a ON h.id = a.human_id 
         WHERE a.slug = 'stevie-wonder' LIMIT 1`
      );
    } else {
      // Find Admin
      userResult = await query(
        `SELECT h.id as human_id, c.username 
         FROM humans h 
         JOIN customers c ON h.id = c.human_id 
         WHERE c.username = 'lucy77' LIMIT 1`
      );
    }

    if (userResult.rows.length === 0) {
      return new Response('Test user not found in database.', { status: 500 });
    }

    const { human_id, username } = userResult.rows[0];

    // Ensure the user actually has the role in human_site_roles
    // Since we are dev-bypassing, we can safely inject the role if they don't have it
    const roleCheck = await query(`SELECT id FROM site_roles WHERE role_name = $1`, [roleType]);
    if (roleCheck.rows.length > 0) {
      await query(`
        INSERT INTO human_site_roles (human_id, site_role_id) 
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `, [human_id, roleCheck.rows[0].id]);
    }

    // 2. Generate the JWT signed session token
    const token = await createSession(human_id, username);

    // 3. Set the secure cookie
    cookies.set('pocket_session', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    console.log(`[AUTH] Dev Bypass successful. Logged in as ${username}.`);

    // 4. Redirect to the appropriate dashboard
    if (roleType === 'artist') {
      return redirect('/artist/dashboard');
    }
    return redirect('/admin/dashboard');

  } catch (error) {
    console.error('[AUTH ERROR]:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
