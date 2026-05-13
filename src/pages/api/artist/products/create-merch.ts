import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';
import fs from 'fs/promises';
import path from 'path';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');

    const session = await verifySession(sessionCookie);
    if (!session || !session.roles?.includes('artist')) {
      return new Response('Unauthorized', { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString() || null;
    const priceStr = formData.get('price')?.toString();
    const inventoryStr = formData.get('inventory')?.toString() || '0';
    const imageFile = formData.get('image_file') as File | null;

    if (!title || !priceStr || !imageFile || !imageFile.name) {
      return new Response('Missing required fields or valid file', { status: 400 });
    }

    const price_cents = Math.round(parseFloat(priceStr) * 100);
    const inventory_count = parseInt(inventoryStr, 10);

    // Get Artist details
    const artistRes = await query('SELECT slug, human_id FROM artists WHERE human_id = $1', [session.humanId]);
    if (artistRes.rows.length === 0) return new Response('Artist not found', { status: 404 });
    const artist = artistRes.rows[0];

    // Generate a new ID for the merch
    const merchRes = await query('SELECT gen_random_uuid() as new_id');
    const merchId = merchRes.rows[0].new_id;

    // Build directory structures for the image
    const ext = path.extname(imageFile.name).toLowerCase() || '.jpg';
    const artistFolder = `${artist.human_id.split('-')[0]}-${artist.slug}`;
    const imageDir = path.join(process.cwd(), 'public', 'media_assets', 'artists', artistFolder, 'products', 'merch');
    await fs.mkdir(imageDir, { recursive: true });

    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const imageFilename = `${merchId}_${safeTitle}${ext}`;
    const imagePath = path.join(imageDir, imageFilename);

    // Save Image File
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(imagePath, buffer);

    // Determine the database URL
    const imageDbPath = `/media_assets/artists/${artistFolder}/products/merch/${imageFilename}`;

    // Insert into DB
    await query(`
      INSERT INTO merch (id, artist_human_id, title, price_cents, inventory_count, description, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [merchId, artist.human_id, title, price_cents, inventory_count, description, imageDbPath]);

    cookies.set('pocket_flash', 'Physical Merchandise listed successfully!', { path: '/' });
    
    return redirect('/artist/dashboard');

  } catch (error) {
    console.error('Error creating merch:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
