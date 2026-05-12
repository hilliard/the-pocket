# SOP: Transactional Email & Notifications

## Goal
To dispatch reliable transactional emails (receipts, downloads, newsletters) using Resend.

## Inputs
1. **Email Metadata**: `to`, `subject`.
2. **Template Data**: `html` body or React/Astro email template string.
3. **Environment Variables**: `RESEND_API_KEY`.

## Execution Logic (The "Happy Path")
1. Request arrives (e.g., from a Stripe webhook confirming successful payment).
2. Server triggers `resend.emails.send()`.
3. Email is dispatched from an authenticated domain (e.g., `receipts@thepocket.com`).
4. Resulting `id` is logged to Postgres database under an `email_logs` table for audit tracing.

## Edge Cases & Error Handling
- **Resend API Failure**: Implement retry logic (up to 3 times with exponential backoff). If it continues to fail, alert admins and queue the email task.
- **Invalid Email Address**: Catch the Resend validation error and mark the customer record as "bounced/invalid".
