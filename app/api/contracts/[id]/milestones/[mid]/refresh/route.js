export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { saveContract } from '@/lib/store';
import { gateway, summarizeTransaction } from '@/lib/braintree';
import { ok, fail } from '@/lib/contracts';
import { loadMilestone } from '@/lib/milestoneRoute';

export async function POST(_req, { params }) {
  const { contract, milestone, error } = await loadMilestone(params);
  if (error) return error;
  if (!milestone.transaction?.id) return fail('This milestone has no Braintree transaction.');
  try {
    const t = await gateway().transaction.find(milestone.transaction.id);
    milestone.transaction = summarizeTransaction(t);
    saveContract(contract);
    return ok({ contract });
  } catch (e) {
    return fail(e.message, 500);
  }
}
