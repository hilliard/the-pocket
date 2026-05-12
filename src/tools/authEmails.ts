// src/tools/authEmails.ts

export async function sendVerificationEmail(email: string, token: string, baseUrl: string) {
  const verificationUrl = `${baseUrl}/api/auth/verify?token=${token}`;
  
  // Strategy 2: Terminal Console Mocking
  // In development, intercept the email and log it safely to the console.
  if (import.meta.env.DEV) {
    console.log('\n======================================================');
    console.log(`[DEV MODE] Intercepted Verification Email to: ${email}`);
    console.log(`Click this link to verify the account:`);
    console.log(verificationUrl);
    console.log('======================================================\n');
    return true; // Simulate success
  }

  // Production Logic: Use Resend to dispatch actual email
  // import { resend } from '../server/resend';
  // await resend.emails.send({ ... })
  console.log('Production email dispatch not yet fully wired to API key.');
  return false;
}
