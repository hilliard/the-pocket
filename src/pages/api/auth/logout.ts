import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Clear the session and cart cookies
  cookies.delete('pocket_session', { path: '/' });
  cookies.delete('pocket_cart', { path: '/' });
  
  // Redirect back to login
  return redirect('/login');
};
