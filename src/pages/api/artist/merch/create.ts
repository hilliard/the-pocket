import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  // @ts-ignore
  const session = locals.session;
  if (!session?.roles?.includes('artist')) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const formData = await request.formData();
    
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString() || null;
    const priceCents = parseInt(formData.get('priceCents')?.toString() || '0', 10);
    const inventoryCount = parseInt(formData.get('inventoryCount')?.toString() || '0', 10);
    const imageUrl = formData.get('imageUrl')?.toString() || null;
    const requiresShipping = formData.get('requiresShipping') === 'true';

    if (!title) {
      return new Response('Item name is required', { status: 400 });
    }

    // Insert the merch into the database
    await query(`
      INSERT INTO merch (artist_human_id, title, description, price_cents, inventory_count, requires_shipping, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      session.humanId, 
      title, 
      description,
      priceCents, 
      inventoryCount,
      requiresShipping,
      imageUrl
    ]);

    // Break out of turbo-frame and reload dashboard
    return redirect('/artist/dashboard');

  } catch (err) {
    console.error('[ARTIST MERCH CREATE ERROR]:', err);
    return new Response('Server Error', { status: 500 });
  }
};
