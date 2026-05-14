import type { APIRoute } from 'astro';
import { verifySession } from '../../../../server/auth';
import { eventBus } from '../../../../server/events';

export const GET: APIRoute = async ({ request, cookies }) => {
  const sessionCookie = cookies.get('pocket_session')?.value;
  if (!sessionCookie) return new Response('Unauthorized', { status: 401 });

  const session = await verifySession(sessionCookie);
  if (!session || !session.roles.includes('artist')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const artist_human_id = session.humanId;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue('event: connected\ndata: true\n\n');

      const onSubscriberAdded = (sub: any) => {
        // Construct the Turbo Stream HTML fragment
        const turboStreamHtml = `
<turbo-stream action="prepend" target="subscribers-list">
  <template>
    <div class="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-3 animate-pulse transition-all">
      <div class="flex flex-col">
        <span class="font-bold text-white">${sub.email}</span>
        <span class="text-xs text-green-400">New Subscriber!</span>
      </div>
      <span class="text-xs text-mono-500 font-mono">${new Date(sub.created_at).toLocaleTimeString()}</span>
    </div>
  </template>
</turbo-stream>
`;
        
        // SSE requires messages to be formatted with 'data: ' and end with double newlines.
        // We replace newlines in the payload with a single space to avoid breaking the SSE format, 
        // or just format it properly:
        const payload = turboStreamHtml.replace(/\n/g, '');
        controller.enqueue(`data: ${payload}\n\n`);
      };

      const eventName = `subscriber_added_${artist_human_id}`;
      eventBus.on(eventName, onSubscriberAdded);

      // Clean up when the client disconnects
      request.signal.addEventListener('abort', () => {
        eventBus.off(eventName, onSubscriberAdded);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
