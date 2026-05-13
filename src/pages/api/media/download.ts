import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { verifySession } from '../../../server/auth';
import { query } from '../../../server/db';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const filePathParam = url.searchParams.get('path');
  const titleParam = url.searchParams.get('title') || 'download';
  
  if (!filePathParam) {
    return new Response('Missing path', { status: 400 });
  }

  // Basic security check to prevent directory traversal
  if (filePathParam.includes('..')) {
    return new Response('Invalid path', { status: 400 });
  }

  // Verify user owns the master file OR is the artist who uploaded it
  const sessionCookie = cookies.get('pocket_session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });
  
  const session = await verifySession(sessionCookie);
  if (!session) return new Response('Unauthorized', { status: 401 });

  // Validate ownership
  const authCheck = await query(
    `SELECT oi.id FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN songs s ON oi.entity_type = 'song' AND oi.entity_id = s.id
     WHERE (o.customer_human_id = $1 OR o.customer_email = 'grammyhaynes0727@gmail.com') 
       AND s.master_audio_path = $2
       AND o.status = 'paid'
     UNION
     SELECT id FROM songs WHERE artist_human_id = $1 AND master_audio_path = $2`,
    [session.humanId, filePathParam]
  );

  if (authCheck.rows.length === 0) {
    return new Response('Forbidden: You do not own this track', { status: 403 });
  }

  // Resolve the absolute path
  const absolutePath = path.resolve(process.cwd(), 'private_assets', filePathParam);

  if (!fs.existsSync(absolutePath)) {
    return new Response('File not found', { status: 404 });
  }

  const stat = fs.statSync(absolutePath);
  const fileSize = stat.size;
  
  // Extract file extension securely
  const ext = path.extname(absolutePath) || '.mp3';
  const cleanTitle = titleParam.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");

  const fileStream = fs.createReadStream(absolutePath);
  return new Response(fileStream as any, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${cleanTitle}${ext}"`
    },
  });
};
