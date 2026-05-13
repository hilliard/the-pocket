import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');

    const session = await verifySession(sessionCookie);
    if (!session || !session.roles?.includes('admin')) {
      return new Response('Unauthorized', { status: 403 });
    }

    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const type = formData.get('type')?.toString();
    const title = formData.get('title')?.toString();
    const priceStr = formData.get('price')?.toString();
    const genre = formData.get('genre')?.toString() || null;
    const cover_url = formData.get('cover_url')?.toString() || null;

    if (!id || !type || !title || !priceStr) {
      return new Response('Missing required fields', { status: 400 });
    }

    const price_cents = Math.round(parseFloat(priceStr) * 100);

    if (type === 'album') {
      await query(
        'UPDATE albums SET title = $1, price_cents = $2, genre = $3, cover_url = $4 WHERE id = $5',
        [title, price_cents, genre, cover_url, id]
      );
    } else if (type === 'song') {
      await query(
        'UPDATE songs SET title = $1, individual_price_cents = $2, genre = $3 WHERE id = $4',
        [title, price_cents, genre, id]
      );
    } else if (type === 'merch') {
      await query(
        'UPDATE merch SET title = $1, price_cents = $2, image_url = $3 WHERE id = $4',
        [title, price_cents, cover_url, id]
      );
    } else {
      return new Response('Invalid product type', { status: 400 });
    }

    cookies.set('pocket_flash', 'Product details updated successfully.', { path: '/' });
    return redirect('/admin/dashboard');

  } catch (error) {
    console.error('Error updating product:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
