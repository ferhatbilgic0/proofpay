export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getContract } from '@/lib/store';
import { ok, fail } from '@/lib/contracts';

export async function GET(_req, { params }) {
  const { id } = await params;
  const contract = getContract(id);
  return contract ? ok({ contract }) : fail('Agreement not found.', 404);
}
