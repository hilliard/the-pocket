import { defineMiddleware } from 'astro:middleware';
import { verifySession } from './server/auth';

export const onRequest = defineMiddleware(async ({ cookies, url, redirect, locals }, next) => {
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
