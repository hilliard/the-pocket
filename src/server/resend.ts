import { Resend } from 'resend';

// Initialize Resend with the API key securely provided by the MCP/env.
export const resend = new Resend(process.env.RESEND_API_KEY || '');
