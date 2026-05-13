import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import { stripe } from '../../../tools/stripe';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const stripeKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response('Stripe is not configured! You need to add STRIPE_SECRET_KEY=sk_test_... to your .env file.', { status: 500 });
    }

    const cartCookie = cookies.get('pocket_cart')?.value;
    if (!cartCookie) {
      return redirect('/cart?error=empty');
    }

    const cart = JSON.parse(cartCookie);
    if (!Array.isArray(cart) || cart.length === 0) {
      return redirect('/cart?error=empty');
    }

    // Process cart items and fetch real prices from DB
    // A cart item looks like: { id: "uuid", type: "album" }
    
    let artistId = null; // Assuming a cart can only have items from ONE artist for simplicity right now
    const lineItems: any[] = [];
    const metadataItems: any[] = [];
    let requiresShipping = false;

    for (const item of cart) {
      let dbItem;
      let name = '';
      let price = 0;
      let imageUrl = null;

      if (item.type === 'album') {
        const res = await query('SELECT title, price_cents, cover_url, artist_human_id FROM albums WHERE id = $1', [item.id]);
        dbItem = res.rows[0];
        name = dbItem?.title || 'Unknown Album';
        price = dbItem?.price_cents || 0;
        imageUrl = dbItem?.cover_url;
      } else if (item.type === 'song') {
        const res = await query('SELECT title, individual_price_cents, artist_human_id FROM songs WHERE id = $1', [item.id]);
        dbItem = res.rows[0];
        name = dbItem?.title || 'Unknown Song';
        price = dbItem?.individual_price_cents || 0;
      } else if (item.type === 'merch') {
        const res = await query('SELECT title, price_cents, image_url, artist_human_id FROM merch WHERE id = $1', [item.id]);
        dbItem = res.rows[0];
        name = dbItem?.title || 'Unknown Merch';
        price = dbItem?.price_cents || 0;
        imageUrl = dbItem?.image_url;
        requiresShipping = true;
      }

      if (dbItem) {
        if (!artistId) artistId = dbItem.artist_human_id;

        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: name,
              images: imageUrl ? [new URL(imageUrl, request.url).toString()] : [],
            },
            unit_amount: price,
          },
          quantity: 1,
        });

        metadataItems.push(`${item.type}:${item.id}:${price}`);
      }
    }

    if (lineItems.length === 0) {
      return redirect('/cart?error=invalid_items');
    }

    // Read session to see if buyer is logged in
    const sessionCookie = cookies.get('pocket_session')?.value;
    let buyerHumanId = null;
    if (sessionCookie) {
      const { verifySession } = await import('../../../server/auth');
      const verified = await verifySession(sessionCookie);
      if (verified) {
        buyerHumanId = verified.humanId;
      }
    }

    const checkoutOptions: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: new URL('/checkout/success?session_id={CHECKOUT_SESSION_ID}', request.url).toString(),
      cancel_url: new URL('/cart', request.url).toString(),
      metadata: {
        artist_human_id: artistId,
        buyer_human_id: buyerHumanId || '',
        // We pack the cart into metadata so the webhook knows what to fulfill
        // format: "type:id:price,type:id:price"
        cart_items: metadataItems.join(','),
      },
    };

    // Only enable tax if the user has configured it in their dashboard and set the env variable
    if (import.meta.env.STRIPE_TAX_ENABLED === 'true' || process.env.STRIPE_TAX_ENABLED === 'true') {
      checkoutOptions.automatic_tax = { enabled: true };
    }

    if (requiresShipping) {
      checkoutOptions.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU'], // Expand as needed
      };
      // Flat rate $5.00 shipping for physical goods
      checkoutOptions.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 500, currency: 'usd' },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(checkoutOptions);

    if (session.url) {
      return redirect(session.url);
    } else {
      throw new Error('Failed to create session URL');
    }

  } catch (err: any) {
    console.error('[STRIPE CHECKOUT ERROR]:', err);
    return new Response(`Error creating checkout session: ${err.message}`, { status: 500 });
  }
};
