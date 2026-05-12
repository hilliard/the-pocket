import type { APIRoute } from 'astro';
import { query } from '../../../../../../server/db';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  // @ts-ignore
  if (!locals.session?.roles?.includes('admin')) {
    return new Response('Forbidden', { status: 403 });
  }

  const { humanId } = params;
  if (!humanId) return new Response('Missing ID', { status: 400 });

  try {
    const formData = await request.formData();
    const roleId = formData.get('roleId')?.toString();

    if (!roleId) return new Response('Role ID required', { status: 400 });

    // Insert into human_site_roles
    await query(`
      INSERT INTO human_site_roles (human_id, site_role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [humanId, roleId]);

    // Break out of the turbo frame by redirecting back to dashboard. 
    // Wait, the client-side form has data-turbo-frame="_top" so redirecting to dashboard will update the entire page, including closing the modal.
    return redirect('/admin/dashboard');

  } catch (err) {
    console.error('[ADMIN ROLE ADD ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
