import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const itemId = formData.get('itemId')?.toString();
    const itemType = formData.get('itemType')?.toString();

    if (!itemId || !itemType) {
      return new Response('Missing parameters', { status: 400 });
    }

    // 1. Read existing cart from cookies
    const cartCookie = cookies.get('pocket_cart')?.value;
    let cart: Array<{ id: string; type: string }> = [];
    
    if (cartCookie) {
      try {
        cart = JSON.parse(cartCookie);
      } catch (e) {
        cart = [];
      }
    }

    // 2. Add new item
    // Only add if it's not already in the cart (assuming you can't buy 2 of the same digital song/album)
    if (!cart.find(i => i.id === itemId && i.type === itemType)) {
      cart.push({ id: itemId, type: itemType });
    }

    // 3. Save cart back to cookie (expires in 7 days)
    cookies.set('pocket_cart', JSON.stringify(cart), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    const cartCount = cart.length;

    // 4. Return a Turbo Stream response to update the UI
    // We will update the 'cart_counter' in the header, AND the specific 'cart_frame_...' that triggered it
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
          <div class="flex items-center gap-2">
            <div class="text-accent font-bold px-4 py-2 rounded-full border border-accent/30 bg-accent/10 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Added
            </div>
            <a href="/cart" data-turbo-frame="_top" class="bg-mono-50 hover:bg-mono-200 text-mono-950 px-4 py-2 rounded-full font-bold transition-colors text-sm flex items-center gap-1 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              Checkout &rarr;
            </a>
          </div>
        </template>
      </turbo-stream>
    `;

    const acceptHeader = request.headers.get('Accept') || '';
    if (!acceptHeader.includes('text/vnd.turbo-stream.html')) {
      // Graceful fallback for non-Turbo requests
      const referer = request.headers.get('Referer') || '/store';
      return redirect(referer);
    }

    return new Response(turboStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/vnd.turbo-stream.html; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
