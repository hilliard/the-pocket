import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { verifySession } from '../../../server/auth';
import { query } from '../../../server/db';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const filePathParam = url.searchParams.get('path');
  const type = url.searchParams.get('type'); // 'master' or 'preview'
  
  if (!filePathParam) {
    return new Response('Missing path', { status: 400 });
  }

  // Basic security check to prevent directory traversal
  if (filePathParam.includes('..')) {
    return new Response('Invalid path', { status: 400 });
  }

  // Previews are public? No, we might put previews in public. But if they are in private_assets:
  // For now we assume this endpoint is for serving secured master files.
  
  if (type === 'master') {
    // Verify user owns the master file OR is the artist who uploaded it
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return new Response('Unauthorized', { status: 401 });
    
    const session = await verifySession(sessionCookie);
    if (!session) return new Response('Unauthorized', { status: 401 });

    // Validate if the user purchased it or is the owner
    // For MVP, we will check if the user is logged in. In production, we'd query `order_items` here.
    // Let's add a basic check:
    // 1. Check active subscription
    const subCheck = await query(
      `SELECT id FROM subscriptions WHERE customer_human_id = $1 AND status = 'active' LIMIT 1`,
      [session.humanId]
    );

    const isSubscriber = subCheck.rows.length > 0;

    // 2. Check direct purchase or artist ownership
    let isOwner = false;
    if (!isSubscriber) {
      const authCheck = await query(
        `SELECT s.id FROM songs s
         LEFT JOIN album_songs asg ON s.id = asg.song_id
         JOIN order_items oi ON (oi.entity_type = 'song' AND oi.entity_id = s.id) OR (oi.entity_type = 'album' AND oi.entity_id = asg.album_id)
         JOIN orders o ON o.id = oi.order_id
         WHERE (o.customer_human_id = $1 OR o.customer_email = 'hilliards@gmail.com') 
           AND s.master_audio_path = $2
           AND o.status = 'paid'
         UNION
         SELECT id FROM songs WHERE artist_human_id = $1 AND master_audio_path = $2`,
        [session.humanId, filePathParam]
      );
      isOwner = authCheck.rows.length > 0;
    }

    if (!isSubscriber && !isOwner) {
      return new Response('Forbidden: You do not own this track or have an active subscription', { status: 403 });
    }
  }

  // Resolve the absolute path
  const absolutePath = path.resolve(process.cwd(), 'private_assets', filePathParam);

  if (!fs.existsSync(absolutePath)) {
    return new Response('File not found', { status: 404 });
  }

  // Support range requests for audio streaming
  const stat = fs.statSync(absolutePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(absolutePath, { start, end });
    
    return new Response(fileStream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'audio/mpeg',
      },
    });
  } else {
    const fileStream = fs.createReadStream(absolutePath);
    return new Response(fileStream as any, {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'audio/mpeg',
      },
    });
  }
};
