# SOP: Stripe Checkout & Billing

## Goal
To process payments securely for digital or physical items via Stripe Checkout.

## Inputs
1. **Cart Payload**: `items` (array of `albumId` or product IDs) from the frontend form/cart store.
2. **Environment Variables**: `STRIPE_SECRET_KEY` for API authentication.

## Execution Logic (The "Happy Path")
1. Request arrives at `POST /api/checkout/session`.
2. Astro API endpoint parses the request body and verifies item pricing against the Postgres database (to prevent client-side price manipulation).
3. The server constructs `line_items` for the Stripe Session.
4. `stripe.checkout.sessions.create()` is called with `line_items`, `success_url`, and `cancel_url`.
5. The API returns the `checkout_url`.
6. The frontend redirects the user to the Stripe-hosted checkout page.

## Edge Cases & Error Handling
- **Database Mismatch**: If the requested item doesn't exist or prices differ, abort checkout and throw a 400 Bad Request.
- **Stripe API Timeout/Error**: Log the error, notify the user "Billing service is temporarily unavailable".
