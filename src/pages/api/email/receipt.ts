import type { APIRoute } from 'astro';
import { resend } from '../../../server/resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, orderId, amount } = await request.json();

    if (!email || !orderId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'The Pocket <receipts@thepocket.com>', // MUST be a verified domain in Resend
      to: [email],
      subject: `Your receipt for Order #${orderId}`,
      html: `
        <div style="font-family: monospace; color: #0f172a;">
          <h2>Thank you for your purchase!</h2>
          <p>Order ID: <strong>${orderId}</strong></p>
          <p>Total: <strong>$${amount}</strong></p>
          <hr />
          <p>Your downloads are securely attached or available in your client dashboard.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return new Response(JSON.stringify({ error }), { status: 400 });
    }

    // In a real scenario, log the data.id to the Postgres database to track successful dispatch.

    return new Response(JSON.stringify({ success: true, messageId: data?.id }), { status: 200 });
  } catch (err: any) {
    console.error("Internal API Error:", err.message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
