import Stripe from 'stripe';

const stripeKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will not work.');
}

export const stripe = new Stripe(stripeKey || 'sk_test_dummy', {
  apiVersion: '2024-04-10', // Or whatever is current
});
