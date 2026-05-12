# Authentication Testing Strategies

When developing role-based access control (RBAC) systems, testing multiple user types (Admins, Artists, Customers) can quickly exhaust your personal email addresses.

To prevent developers from being locked out of their own system, The Pocket implements three core testing strategies:

## 1. Plus Addressing (The Production-Safe Method)
If you are testing live email delivery but only have one inbox, use "plus addressing". Major email providers (Gmail, Outlook) ignore anything after a `+` sign.
- **Database sees**: `hilliard+admin@gmail.com` and `hilliard+artist@gmail.com` as two entirely distinct, unique users.
- **Provider sees**: Both emails route seamlessly to `hilliard@gmail.com`.

*Use this when validating the actual Resend production delivery pipeline.*

## 2. Terminal Console Mocking (The Default Dev Flow)
When `NODE_ENV=development` (running via `npm run dev`), the `authEmails.ts` dispatcher intercepts outbound verification emails.
Instead of burning API quota or requiring a real inbox, it renders the HTML payload directly into your VSCode terminal console.

**Workflow:**
1. Sign up with a completely fake email (e.g., `lucy77@fake.com`).
2. Check your terminal output.
3. Ctrl+Click the `http://localhost:4321/api/auth/verify?token=...` link printed in the terminal.
4. The account is verified!

## 3. The "Auto-Verify" Dev Bypass Button
For rapid UI iteration, login and signup forms include a special conditional UI block.
If `import.meta.env.DEV` is true, an **"Auto-Verify & Login"** button appears below the standard forms. Clicking this button bypasses the email phase entirely, forcing the database to instantly verify the account and generate an active session cookie.

*Note: This UI element is stripped completely from the production build by the Astro compiler.*
