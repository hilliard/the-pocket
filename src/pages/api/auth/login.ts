import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { query } from '../../../server/db';
import { createSession } from '../../../server/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const username = formData.get('username')?.toString().trim().toLowerCase();
    const password = formData.get('password')?.toString();

    if (!username || !password) {
      return new Response('Username and password are required', { status: 400 });
    }

    // 1. Fetch user from DB
    // We check both username (customers table) or email (email_history table)
    const userResult = await query(
      `SELECT h.id as human_id, c.username, c.password_hash 
       FROM humans h 
       JOIN customers c ON h.id = c.human_id 
       LEFT JOIN email_history eh ON h.id = eh.human_id AND eh.effective_to IS NULL
       WHERE c.username = $1 OR eh.email = $1
       LIMIT 1`,
      [username] // Note: username var is just the input string, which could be an email
    );

    if (userResult.rows.length === 0) {
      return new Response('Invalid credentials or inactive account', { status: 401 });
    }

    const user = userResult.rows[0];

    // 2. Verify password hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return new Response('Invalid credentials', { status: 401 });
    }

    // 3. Generate JWT Session Token
    const token = await createSession(user.human_id, user.username);

    // 4. Set Secure Cookie
    cookies.set('pocket_session', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    cookies.set('pocket_returning', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 5 // 5 years
    });

    console.log(`[AUTH] Successful login for user: ${user.username}`);

    // 5. Redirect based on role
    const rolesResult = await query(
      `SELECT r.role_name FROM site_roles r
       JOIN human_site_roles hr ON r.id = hr.site_role_id
       WHERE hr.human_id = $1`,
      [user.human_id]
    );
    const roles = rolesResult.rows.map(r => r.role_name);

    if (roles.includes('admin')) {
      return redirect('/admin/dashboard');
    } else if (roles.includes('artist')) {
      return redirect('/artist/dashboard');
    } else {
      return redirect('/dashboard');
    }

  } catch (error) {
    console.error('[AUTH ERROR]:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
