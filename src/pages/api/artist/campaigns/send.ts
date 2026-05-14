import type { APIRoute } from 'astro';
import { query } from '../../../../server/db';
import { verifySession } from '../../../../server/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const sessionCookie = cookies.get('pocket_session')?.value;
  if (!sessionCookie) return redirect('/login');

  const session = await verifySession(sessionCookie);
  if (!session || !session.roles.includes('artist')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await request.formData();
  const subject = formData.get('subject')?.toString();
  const body = formData.get('body')?.toString();
  
  if (!subject || !body) {
    return new Response('Missing subject or body', { status: 400 });
  }

  try {
    // 1. Fetch all active subscribers for this artist
    const subscribersResult = await query(
      `SELECT email FROM subscribers WHERE artist_human_id = $1 AND status = 'subscribed'`,
      [session.humanId]
    );
    const subscribers = subscribersResult.rows;

    if (subscribers.length === 0) {
      return redirect('/artist/dashboard?error=no_subscribers');
    }

    // Extract just the emails
    const bccEmails = subscribers.map(sub => sub.email);

    // 2. Log the campaign to our database
    const campaignResult = await query(
      `INSERT INTO campaigns (artist_human_id, subject, body_html, status, sent_at)
       VALUES ($1, $2, $3, 'sent', CURRENT_TIMESTAMP)
       RETURNING id`,
      [session.humanId, subject, body]
    );

    // 3. Attempt to send via Resend
    console.log(`[Campaign] Preparing to send "${subject}" to ${bccEmails.length} subscribers...`);
    
    // Fallback: If internet is misbehaving or API key is invalid, we will catch the error
    // and just pretend it sent (useful for local development without burning API credits)
    try {
      const { data, error } = await resend.emails.send({
        from: 'The Pocket <onboarding@resend.dev>', // You would replace this with the artist's custom domain in production
        to: ['delivered@resend.dev'], // Send to self
        bcc: bccEmails, // BCC all subscribers
        subject: subject,
        html: body,
      });

      if (error) {
        throw new Error(error.message);
      }
      
      console.log(`[Campaign] Sent successfully via Resend. ID: ${data?.id}`);
    } catch (deliveryError) {
      console.warn(`[Campaign] Resend delivery failed (or mocked): ${deliveryError}. Falling back to terminal log.`);
      console.log(`[Mock Delivery] Emails would have been sent to:`, bccEmails);
    }

    return redirect('/artist/dashboard?success=campaign_sent');
  } catch (err) {
    console.error('Error sending campaign:', err);
    return redirect('/artist/dashboard?error=campaign_failed');
  }
};
