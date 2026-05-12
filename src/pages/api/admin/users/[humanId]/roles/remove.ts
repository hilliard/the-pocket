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

    // Delete from human_site_roles
    await query(`
      DELETE FROM human_site_roles 
      WHERE human_id = $1 AND site_role_id = $2
    `, [humanId, roleId]);

    // Break out of the turbo frame by redirecting back to dashboard. 
    return redirect('/admin/dashboard');

  } catch (err) {
    console.error('[ADMIN ROLE REMOVE ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
