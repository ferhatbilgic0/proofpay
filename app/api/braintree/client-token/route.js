export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { gateway } from '@/lib/braintree';
import { ok, fail } from '@/lib/contracts';

export async function GET() {
  try {
    const { clientToken } = await gateway().clientToken.generate({});
    return ok({ clientToken });
  } catch (e) {
    return fail(e.message, 500);
  }
}
