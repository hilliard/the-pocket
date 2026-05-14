import type { APIRoute } from 'astro';
import { verifySession } from '../../../server/auth';
import { stripe } from '../../../tools/stripe';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const sessionCookie = cookies.get('pocket_session')?.value;
    if (!sessionCookie) {
      return redirect('/login');
    }

    const session = await verifySession(sessionCookie);
    if (!session) {
      return redirect('/login');
    }

    const { query } = await import('../../../server/db');
    const userResult = await query(
      `SELECT email FROM email_history WHERE human_id = $1 AND effective_to IS NULL ORDER BY effective_from DESC LIMIT 1`, 
      [session.humanId]
    );
    const userEmail = userResult.rows[0]?.email;

    const formData = await request.formData();
    const planId = formData.get('planId')?.toString(); // 'monthly' or 'yearly'

    if (!planId) {
      return new Response('Missing planId', { status: 400 });
    }

    let interval: 'month' | 'year' = 'month';
    let amount = 999;
    let name = 'Monthly Fan Plan';

    if (planId === 'yearly') {
      interval = 'year';
      amount = 9000;
      name = 'Yearly Fan Plan';
    }

    const checkoutOptions: any = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: {
              interval: interval,
            },
            product_data: {
              name: name,
              description: 'Ad-free high-quality streaming and exclusive artist content.',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: new URL('/checkout/success?session_id={CHECKOUT_SESSION_ID}', request.url).toString(),
      cancel_url: new URL('/dashboard', request.url).toString(),
      customer_email: userEmail, // Force Stripe to use their real email
      metadata: {
        buyer_human_id: session.humanId,
        subscription_plan: planId, // Let the webhook know what they bought
      },
    };

    // Only enable tax if the user has configured it in their dashboard
    if (import.meta.env.STRIPE_TAX_ENABLED === 'true' || process.env.STRIPE_TAX_ENABLED === 'true') {
      checkoutOptions.automatic_tax = { enabled: true };
    }

    const stripeSession = await stripe.checkout.sessions.create(checkoutOptions);

    if (stripeSession.url) {
      return redirect(stripeSession.url);
    } else {
      throw new Error('Failed to create session URL');
    }

  } catch (err: any) {
    console.error('[STRIPE SUBSCRIPTION ERROR]:', err);
    return new Response(`Error creating subscription session: ${err.message}`, { status: 500 });
  }
};
