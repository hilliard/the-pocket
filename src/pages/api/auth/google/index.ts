import type { APIRoute } from 'astro';
import { google } from 'googleapis';
import { verifySession } from '../../../../server/auth';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');
    
    const session = await verifySession(sessionCookie);
    if (!session || !session.roles.includes('artist')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      import.meta.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      import.meta.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      import.meta.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Requests a refresh token
      prompt: 'consent select_account', // Forces the consent screen AND account chooser
      scope: scopes,
      state: sessionCookie // Pass session to use in callback
    });

    return redirect(url);
  } catch (error) {
    console.error('Google Auth Init Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
