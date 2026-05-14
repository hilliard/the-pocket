import type { APIRoute } from 'astro';
import { google } from 'googleapis';
import { verifySession } from '../../../../server/auth';
import { query } from '../../../../server/db';

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  try {
    // Re-verify session from state parameter
    const session = await verifySession(state);
    if (!session || !session.roles.includes('artist')) {
      return new Response('Unauthorized or invalid session state', { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      import.meta.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      import.meta.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      import.meta.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      // Store the refresh token in the database for the artist
      await query(
        `UPDATE artists SET google_refresh_token = $1 WHERE human_id = $2`,
        [tokens.refresh_token, session.humanId]
      );
      console.log(`[Google Auth] Saved refresh token for artist ${session.humanId}`);
    } else {
      console.log(`[Google Auth] No refresh token returned. User may have already authorized. Force prompt='consent' in init route if missing.`);
    }

    // Redirect the artist back to their dashboard
    return redirect('/artist/dashboard?google_sync=success');

  } catch (error) {
    console.error('Google Auth Callback Error:', error);
    return new Response('Failed to authenticate with Google', { status: 500 });
  }
};
