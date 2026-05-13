import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // 1. Authenticate and authorize as admin
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');

    const session = await verifySession(sessionCookie);
    if (!session || !session.roles?.includes('admin')) {
      return new Response('Unauthorized - Admins only', { status: 403 });
    }

    // 2. Parse request
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const type = formData.get('type')?.toString(); // 'album', 'song', or 'merch'

    if (!id || !type) {
      return new Response('Missing parameters', { status: 400 });
    }

    // 3. Delete from the respective database table
    if (type === 'album') {
      await query('DELETE FROM albums WHERE id = $1', [id]);
    } else if (type === 'song') {
      await query('DELETE FROM songs WHERE id = $1', [id]);
    } else if (type === 'merch') {
      await query('DELETE FROM merch WHERE id = $1', [id]);
    } else {
      return new Response('Invalid product type', { status: 400 });
    }

    // 4. Set Toast and Redirect back to the dashboard
    cookies.set('pocket_flash', 'Product permanently deleted.', { path: '/' });
    return redirect('/admin/dashboard');

  } catch (error) {
    console.error('Error deleting product globally:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
