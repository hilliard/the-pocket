import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { query } from '../../../server/db';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2023-10-16',
});

// Since Stripe webhooks send raw body, Astro needs a special config or we read it manually.
export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET || 'whsec_123';

  if (!sig) {
    return new Response('No signature provided', { status: 400 });
  }

  let event;
  try {
    const text = await request.text();
    event = stripe.webhooks.constructEvent(text, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // We only care about pocket orders
    if (session.metadata?.is_pocket_order !== 'true') {
      return new Response('Ignored', { status: 200 });
    }

    try {
      // 1. Create the Order
      const customerEmail = session.customer_details?.email || session.customer_email || 'unknown@example.com';
      const subtotalCents = session.amount_subtotal || 0;
      const totalCents = session.amount_total || 0;
      const stripeSessionId = session.id;
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
      
      const humanId = session.client_reference_id; // UUID of logged in user, if any

      const orderResult = await query(
        `INSERT INTO orders (customer_human_id, stripe_session_id, stripe_payment_intent_id, customer_email, subtotal_cents, total_cents, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid')
         RETURNING id`,
        [humanId || null, stripeSessionId, paymentIntentId, customerEmail, subtotalCents, totalCents]
      );

      const orderId = orderResult.rows[0].id;

      // 2. Parse metadata to create Order Items
      // metadata.cart_contents = "album:123,song:456,merch:789"
      const cartContents = session.metadata?.cart_contents || '';
      if (cartContents) {
        const pairs = cartContents.split(',');
        for (const pair of pairs) {
          const [type, id] = pair.split(':');
          if (type && id) {
            // We need to fetch the price at the time of order or just use 0 if we rely on Stripe's total
            // For data integrity, let's fetch the price from the DB (assuming it hasn't changed in the last 2 minutes)
            let priceCents = 0;
            if (type === 'album') {
              const r = await query(`SELECT price_cents FROM albums WHERE id = $1`, [id]);
              if (r.rows.length) priceCents = r.rows[0].price_cents;
            } else if (type === 'song') {
              const r = await query(`SELECT individual_price_cents FROM songs WHERE id = $1`, [id]);
              if (r.rows.length) priceCents = r.rows[0].individual_price_cents;
            } else if (type === 'merch') {
              const r = await query(`SELECT price_cents FROM merch WHERE id = $1`, [id]);
              if (r.rows.length) priceCents = r.rows[0].price_cents;
            }

            await query(
              `INSERT INTO order_items (order_id, entity_type, entity_id, price_cents, quantity)
               VALUES ($1, $2, $3, $4, 1)`,
              [orderId, type, id, priceCents]
            );
          }
        }
      }

      console.log(`[WEBHOOK] Order ${orderId} successfully created from Stripe Session ${stripeSessionId}`);

    } catch (dbError) {
      console.error('[WEBHOOK DB ERROR]:', dbError);
      return new Response('Database error', { status: 500 });
    }
  }

  return new Response('Success', { status: 200 });
};
