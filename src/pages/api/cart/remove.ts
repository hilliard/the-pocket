import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const itemId = formData.get('itemId')?.toString();
    const itemType = formData.get('itemType')?.toString();

    if (!itemId || !itemType) {
      return new Response('Missing parameters', { status: 400 });
    }

    const cartCookie = cookies.get('pocket_cart')?.value;
    if (!cartCookie) {
      return redirect('/cart');
    }

    let cart: Array<{ id: string; type: string }> = [];
    try {
      cart = JSON.parse(cartCookie);
    } catch (e) {
      return redirect('/cart');
    }

    // Filter out the item to remove
    const updatedCart = cart.filter(i => !(i.id === itemId && i.type === itemType));

    // Save updated cart to cookie
    cookies.set('pocket_cart', JSON.stringify(updatedCart), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Check if we requested a turbo stream (e.g. from the store page)
    const acceptHeader = request.headers.get('Accept') || '';
    if (acceptHeader.includes('text/vnd.turbo-stream.html')) {
      const cartCount = updatedCart.length;
      const frameId = `cart_frame_${itemType}_${itemId}`;
      
      const turboStream = `
        <turbo-stream action="update" target="cart_counter">
          <template>
            <a href="/cart" data-turbo-frame="_top" class="flex items-center gap-2 text-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="font-bold bg-accent text-mono-950 px-2 py-0.5 rounded-full text-xs shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                ${cartCount}
              </span>
            </a>
          </template>
        </turbo-stream>

        <turbo-stream action="update" target="${frameId}">
          <template>
            <form method="POST" action="/api/cart/add">
              <input type="hidden" name="itemId" value="${itemId}" />
              <input type="hidden" name="itemType" value="${itemType}" />
              <button type="submit" class="text-mono-400 hover:text-accent p-2 rounded-full hover:bg-accent/10 transition-colors" aria-label="Buy ${itemType}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
              </button>
            </form>
          </template>
        </turbo-stream>
      `;

      return new Response(turboStream, {
        status: 200,
        headers: { 'Content-Type': 'text/vnd.turbo-stream.html; charset=utf-8' }
      });
    }

    // Default: Redirect back to cart page
    return redirect('/cart');

  } catch (error) {
    console.error('Error removing from cart:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
