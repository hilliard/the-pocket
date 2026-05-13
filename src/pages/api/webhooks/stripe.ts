import type { APIRoute } from 'astro';
import { stripe } from '../../../tools/stripe';
import { query } from '../../../server/db';

// Required for Stripe webhook raw body verification
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');
  const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      // Validate signature if secret is provided
      event = stripe.webhooks.constructEvent(payload, sig as string, endpointSecret);
    } else {
      // For local testing without a webhook secret, just parse it
      event = JSON.parse(payload);
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Fulfill the order
    try {
      const stripeSessionId = session.id;
      const customerEmail = session.customer_details?.email || session.customer_email || 'unknown@example.com';
      const totalCents = session.amount_total || 0;
      const metadata = session.metadata || {};
      
      const artistHumanId = metadata.artist_human_id;
      const buyerHumanId = metadata.buyer_human_id || null;
      const cartItemsStr = metadata.cart_items || '';

      // Create Order
      const orderResult = await query(
        `INSERT INTO orders (artist_human_id, customer_human_id, stripe_session_id, customer_email, subtotal_cents, total_cents, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid')
         RETURNING id`,
        [artistHumanId, buyerHumanId, stripeSessionId, customerEmail, totalCents, totalCents]
      );

      const orderId = orderResult.rows[0].id;

      // Spawn Order Items
      if (cartItemsStr) {
        const items = cartItemsStr.split(',');
        for (const item of items) {
          const [type, id, priceStr] = item.split(':');
          const price = parseInt(priceStr, 10);
          
          await query(
            `INSERT INTO order_items (order_id, entity_type, entity_id, price_cents)
             VALUES ($1, $2, $3, $4)`,
            [orderId, type, id, price]
          );

          // Inventory reduction for physical goods
          if (type === 'merch') {
            await query(`UPDATE merch SET inventory_count = GREATEST(inventory_count - 1, 0) WHERE id = $1`, [id]);
          }
        }
      }

      console.log(`[WEBHOOK SUCCESS]: Order ${orderId} fulfilled for ${customerEmail}`);
    } catch (dbErr: any) {
      console.error('[WEBHOOK DB ERROR]:', dbErr);
      return new Response(`Database Error: ${dbErr.message}`, { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
