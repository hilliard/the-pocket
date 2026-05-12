import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getCartItems } from '../../../tools/getCartItems';
import { verifySession } from '../../../server/auth';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2023-10-16', // Typical stable version, or leave default
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // 1. Get cart items from cookie
    const cartCookie = cookies.get('pocket_cart')?.value;
    if (!cartCookie) return redirect('/cart');

    let cartRaw: Array<{ id: string; type: string }> = [];
    try {
      cartRaw = JSON.parse(cartCookie);
    } catch (e) {
      return redirect('/cart');
    }

    if (cartRaw.length === 0) return redirect('/cart');

    const items = await getCartItems(cartRaw);
    if (items.length === 0) return redirect('/cart');

    // 2. Identify the customer (if logged in)
    const sessionCookie = cookies.get('pocket_session')?.value;
    let customerId = null;
    let customerEmail = undefined;

    if (sessionCookie) {
      const authSession = await verifySession(sessionCookie);
      if (authSession) {
        customerId = authSession.humanId;
        // In a full implementation, you'd query the DB to get their actual email
        // customerEmail = await getCustomerEmail(customerId);
      }
    }

    // 3. Build Stripe Line Items
    const lineItems = items.map(item => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.title} (${item.type.toUpperCase()})`,
            description: `By ${item.artist_name}`,
            images: item.cover_url ? [item.cover_url] : [],
            metadata: {
              product_id: item.id,
              product_type: item.type
            }
          },
          unit_amount: item.price_cents,
        },
        quantity: 1, // Currently fixed at 1 per unique item in cart
      };
    });

    // 4. Create Stripe Checkout Session
    const domain = import.meta.env.SITE || 'http://localhost:4321';
    
    // Convert cart objects to a comma separated string for metadata limit 
    const cartMetadataStr = cartRaw.map(i => `${i.type}:${i.id}`).join(',').substring(0, 500);

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${domain}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cart`,
      customer_email: customerEmail,
      client_reference_id: customerId,
      metadata: {
        cart_contents: cartMetadataStr,
        is_pocket_order: 'true'
      }
    });

    // 5. Redirect the user to Stripe's hosted checkout page!
    if (!stripeSession.url) {
      throw new Error('No Stripe session URL returned.');
    }

    return redirect(stripeSession.url, 303);

  } catch (error) {
    console.error('[STRIPE ERROR]:', error);
    // If they haven't configured their Stripe key yet, let's gracefully fallback
    if (error instanceof Stripe.errors.AuthenticationError) {
      return new Response(`
        <div style="padding: 20px; font-family: sans-serif; text-align: center;">
          <h2>Stripe is not configured!</h2>
          <p>You need to add <code>STRIPE_SECRET_KEY=sk_test_...</code> to your <code>.env</code> file.</p>
          <a href="/cart">Go back to cart</a>
        </div>
      `, { status: 500, headers: { 'Content-Type': 'text/html' }});
    }
    return new Response('Internal Server Error while creating checkout', { status: 500 });
  }
};
