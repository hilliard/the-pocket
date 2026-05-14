import { defineMiddleware } from 'astro:middleware';
import { verifySession } from './server/auth';
import { query } from './server/db';

export const onRequest = defineMiddleware(async ({ request, cookies, url, redirect, locals, rewrite }, next) => {
  // 0. Custom Domain Routing (The "Toaster" Plugin)
  const host = request.headers.get('host') || '';
  
  // Skip standard development domains and our central platform domain
  if (!host.includes('127.0.0.1') && !host.includes('localhost') && !host.includes('the-pocket.com')) {
    const cleanHost = host.split(':')[0]; // Remove port if it exists (e.g. joeuser.local:4321)
    
    try {
      const domainResult = await query(`
        SELECT a.slug 
        FROM custom_domains cd
        JOIN artists a ON a.human_id = cd.artist_human_id
        WHERE cd.domain = $1 AND cd.status = 'active'
      `, [cleanHost]);

      if (domainResult.rows.length > 0) {
        const slug = domainResult.rows[0].slug;
        
        // If they are hitting the root of the custom domain, serve the public Hub silently!
        if (url.pathname === '/' || url.pathname === '') {
          return rewrite(new URL(`/clients/artists/${slug}/public`, request.url));
        }
      }
    } catch (err) {
      console.error('[Middleware] Custom domain lookup error:', err);
    }
  }

  // 1. Intercept requests to protected paths
  const isAdminPath = url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin');
  const isArtistPath = url.pathname.startsWith('/artist') || url.pathname.startsWith('/api/artist');

  if (isAdminPath || isArtistPath) {
    
    // 2. Read the session cookie
    const token = cookies.get('pocket_session')?.value;
    
    if (!token) {
      // Unauthenticated, redirect to login
      return redirect('/login');
    }

    // 3. Verify the JWT
    const session = verifySession(token);
    
    if (!session) {
      // Invalid or expired token
      cookies.delete('pocket_session', { path: '/' });
      return redirect('/login');
    }

    // 4. Role-Based Access Control (RBAC) Enforcement
    if (isAdminPath && !session.roles.includes('admin')) {
      return new Response('Forbidden: Admin access required', { status: 403 });
    }

    if (isArtistPath && !session.roles.includes('artist')) {
      // It's possible they are an admin trying to test, but let's strictly require the artist role.
      return new Response('Forbidden: Artist access required', { status: 403 });
    }

    // 5. Inject user session into Astro locals for use in .astro files
    // @ts-ignore
    locals.session = session;
  }

  // Allow the request to proceed
  return next();
});
