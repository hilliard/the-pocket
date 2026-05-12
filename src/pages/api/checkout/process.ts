import type { APIRoute } from 'astro';
import { query } from '../../../server/db';
import { getCartItems } from '../../../tools/getCartItems';

// In a real environment, you would import your Stripe singleton here
// import { stripe } from '../../../server/stripe';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // 1. Read Cart State
    const cartCookie = cookies.get('pocket_cart')?.value;
    if (!cartCookie) {
      return redirect('/cart');
    }

    const rawCart = JSON.parse(cartCookie);
    if (rawCart.length === 0) {
      return redirect('/cart');
    }

    // 2. Hydrate & Validate Prices from Database (Never trust the client)
    const cartItems = await getCartItems(rawCart);
    const subtotalCents = cartItems.reduce((acc, item) => acc + item.price_cents, 0);

    // TODO: In a full implementation, you would capture coupon_code and loyalty_points_used 
    // from the FormData, validate them against the DB, and calculate discounts.
    const discountCents = 0;
    const loyaltyPointsUsed = 0;
    const totalCents = subtotalCents - discountCents;

    // For now, we assume all items in the cart belong to the same artist (Me-Commerce model).
    // Let's look up the artist_human_id from the first item.
    let artistHumanId = null;
    if (rawCart[0].type === 'album') {
       const res = await query('SELECT artist_human_id FROM albums WHERE id = $1 LIMIT 1', [rawCart[0].id]);
       if (res.rows.length) artistHumanId = res.rows[0].artist_human_id;
    } else {
       const res = await query('SELECT artist_human_id FROM songs WHERE id = $1 LIMIT 1', [rawCart[0].id]);
       if (res.rows.length) artistHumanId = res.rows[0].artist_human_id;
    }

    // 3. Create the Order Record in Postgres
    // (In production, you'd wrap this in a SQL TRANSACTION so order_items don't fail midway)
    const orderResult = await query(
      `INSERT INTO orders (artist_human_id, customer_email, subtotal_cents, discount_cents, loyalty_points_used, total_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id;`,
      [artistHumanId, 'guest@example.com', subtotalCents, discountCents, loyaltyPointsUsed, totalCents]
    );
    
    const orderId = orderResult.rows[0].id;

    // 4. Create Order Items
    for (const item of cartItems) {
      await query(
        `INSERT INTO order_items (order_id, entity_type, entity_id, price_cents, quantity)
         VALUES ($1, $2, $3, $4, 1);`,
        [orderId, item.type, item.id, item.price_cents]
      );
    }

    console.log(`[Checkout] Order ${orderId} created successfully. Total: $${(totalCents / 100).toFixed(2)}`);

    // 5. Clear the Cart Cookie now that the order is formalized
    cookies.delete('pocket_cart', { path: '/' });

    // 6. Stripe Checkout (Mocked)
    // Normally: const session = await stripe.checkout.sessions.create({...});
    // return redirect(session.url);
    
    // For this demonstration, we will just redirect to a mock success page
    return redirect(`/checkout/success?order_id=${orderId}`);

  } catch (error) {
    console.error('[Checkout Error]:', error);
    return new Response('Checkout Failed', { status: 500 });
  }
};
