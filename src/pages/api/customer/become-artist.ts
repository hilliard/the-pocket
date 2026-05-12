import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import { verifySession, createSession } from '../../../server/auth';

import { createMediaStructure } from '../../../tools/createMediaStructure';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');

    const session = await verifySession(sessionCookie);
    if (!session) return redirect('/login');

    const humanId = session.humanId;

    // 1. Get the human's first and last name to auto-generate a stage name and slug
    const humanResult = await query(`SELECT first_name, last_name FROM humans WHERE id = $1`, [humanId]);
    if (humanResult.rows.length === 0) return redirect('/login');
    
    const { first_name, last_name } = humanResult.rows[0];
    const stageName = `${first_name} ${last_name}`.trim();
    // Convert to slug: lowercase, replace spaces with hyphens, remove non-alphanumeric
    let slug = stageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // 2. Check if slug is taken, append random number if it is
    let isSlugTaken = true;
    let finalSlug = slug;
    while (isSlugTaken) {
      const slugCheck = await query(`SELECT human_id FROM artists WHERE slug = $1`, [finalSlug]);
      if (slugCheck.rows.length === 0) {
        isSlugTaken = false;
      } else {
        finalSlug = `${slug}-${Math.floor(Math.random() * 10000)}`;
      }
    }

    // 3. Insert into Artists table
    // We use ON CONFLICT DO NOTHING just in case they already clicked it
    await query(
      `INSERT INTO artists (human_id, slug, stage_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (human_id) DO NOTHING`,
      [humanId, finalSlug, stageName]
    );

    // Scaffold the media directories instantly for the new artist!
    await createMediaStructure({
      humanIdShort: humanId.split('-')[0], // e.g. 48cfc0f6
      stageName: stageName
    });

    // 4. Assign the 'artist' role
    const roleCheck = await query(`SELECT id FROM site_roles WHERE role_name = 'artist'`);
    if (roleCheck.rows.length > 0) {
      await query(
        `INSERT INTO human_site_roles (human_id, site_role_id) 
         VALUES ($1, $2) 
         ON CONFLICT (human_id, site_role_id) DO NOTHING`,
        [humanId, roleCheck.rows[0].id]
      );
    }

    console.log(`[UPGRADE] Customer ${humanId} upgraded to Artist (${finalSlug})`);

    // 5. Re-generate Session Cookie to include the new 'artist' role!
    // Since createSession does a fresh DB lookup for roles, it will fetch the new artist role.
    const usernameResult = await query(`SELECT username FROM customers WHERE human_id = $1`, [humanId]);
    if (usernameResult.rows.length > 0) {
      const newToken = await createSession(humanId, usernameResult.rows[0].username);
      cookies.set('pocket_session', newToken, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    }

    // 6. Redirect to the newly minted Artist Dashboard!
    return redirect('/artist/dashboard');

  } catch (error) {
    console.error('[UPGRADE ERROR]:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
