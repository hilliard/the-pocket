import type { APIRoute } from 'astro';
import { stripe } from '../../../server/stripe';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const albumId = formData.get('albumId')?.toString();

    if (!albumId) {
      return new Response(JSON.stringify({ error: "Missing albumId" }), { status: 400 });
    }

    // In a real scenario, fetch product details from Postgres here to prevent price manipulation
    // e.g. const product = await getProductById(albumId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Album: ${albumId}`, // Fallback placeholder
            },
            unit_amount: 1499, // Represents $14.99 (should come from DB!)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Provide valid success/cancel URLs based on the origin
      success_url: `${new URL(request.url).origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/checkout/canceled`,
    });

    if (session.url) {
      // 303 Redirect to Stripe Checkout page
      return redirect(session.url, 303);
    }
    
    throw new Error("Stripe session URL not generated.");
  } catch (err: any) {
    console.error("Stripe Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
