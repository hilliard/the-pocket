import type { APIRoute } from 'astro';
import { verifySession } from '../../../server/auth';
import { stripe } from '../../../tools/stripe';
import { query } from '../../../server/db';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) return redirect('/login');
    
    const session = await verifySession(sessionCookie);
    if (!session) return redirect('/login');

    const subResult = await query(
      `SELECT stripe_subscription_id FROM subscriptions WHERE customer_human_id = $1 ORDER BY created_at DESC LIMIT 1`, 
      [session.humanId]
    );
    
    const stripeSubId = subResult.rows[0]?.stripe_subscription_id;
    if (!stripeSubId) {
      return new Response('No active subscription found', { status: 404 });
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubId);
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,
      return_url: new URL('/customer/dashboard', request.url).toString(),
    });

    return redirect(portalSession.url);
  } catch (err: any) {
    console.error('[STRIPE PORTAL ERROR]:', err);
    return new Response(`Error opening customer portal: ${err.message}`, { status: 500 });
  }
};
