import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import { createSession } from '../../../server/auth';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const email = formData.get('email')?.toString().trim().toLowerCase();
    const username = formData.get('username')?.toString().trim().toLowerCase();
    const password = formData.get('password')?.toString();

    if (!firstName || !lastName || !email || !username || !password) {
      return redirect('/signup?error=All fields are required');
    }

    if (password.length < 8) {
      return redirect('/signup?error=Password must be at least 8 characters long');
    }

    // 1. Check if username or email already exists
    const existingCustomer = await query(`SELECT username FROM customers WHERE username = $1`, [username]);
    if (existingCustomer.rows.length > 0) {
      return redirect('/signup?error=Username is already taken');
    }

    const existingEmail = await query(`SELECT email FROM email_history WHERE email = $1 AND effective_to IS NULL`, [email]);
    if (existingEmail.rows.length > 0) {
      return redirect('/signup?error=Email address is already registered');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Insert into Humans
    const humanResult = await query(
      `INSERT INTO humans (first_name, last_name) VALUES ($1, $2) RETURNING id`,
      [firstName, lastName]
    );
    const humanId = humanResult.rows[0].id;

    // 3. Insert into Customers
    await query(
      `INSERT INTO customers (human_id, username, password_hash) VALUES ($1, $2, $3)`,
      [humanId, username, passwordHash]
    );

    // 4. Insert Email History (since email isn't on the humans table directly in this design)
    await query(
      `INSERT INTO email_history (human_id, email, change_reason) VALUES ($1, $2, 'initial')`,
      [humanId, email]
    );

    // 5. Assign the 'customer' role
    const roleCheck = await query(`SELECT id FROM site_roles WHERE role_name = 'customer'`);
    if (roleCheck.rows.length > 0) {
      await query(
        `INSERT INTO human_site_roles (human_id, site_role_id) VALUES ($1, $2)`,
        [humanId, roleCheck.rows[0].id]
      );
    }

    // 6. Give the user a 14-day free trial subscription
    await query(
      `INSERT INTO subscriptions (customer_human_id, plan_id, status, trial_start, trial_end, current_period_end)
       VALUES ($1, 'basic_tier', 'trialing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', CURRENT_TIMESTAMP + INTERVAL '14 days')`,
      [humanId]
    );

    // 7. Generate Session Cookie
    const token = await createSession(humanId, username);
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

    console.log(`[AUTH] New user signed up: ${username}`);

    // Redirect to the dashboard (which will route them to /customer/dashboard)
    return redirect('/dashboard');

  } catch (error) {
    console.error('[SIGNUP ERROR]:', error);
    return redirect('/signup?error=An unexpected error occurred during signup');
  }
};
