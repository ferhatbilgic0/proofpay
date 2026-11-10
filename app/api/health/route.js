export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { aiInfo } from '@/lib/ai';

// Used by Render's health check and for a quick look at the live configuration. Never returns secret values.
export async function GET() {
  const braintree = ['BRAINTREE_MERCHANT_ID', 'BRAINTREE_PUBLIC_KEY', 'BRAINTREE_PRIVATE_KEY'].every((k) => !!process.env[k]);
  const ai = aiInfo();
  const aiKey = ai.provider === 'mock' || !!process.env[ai.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'];
  return Response.json({ ok: true, braintreeConfigured: braintree, ai: ai.label, aiKeyConfigured: aiKey });
}
