import Stripe from 'stripe';

// Initialize Stripe with the secret key securely provided by the MCP/env.
// Assert the API version to match the installed SDK version.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia', // Currently latest or standard depending on installed version
});
