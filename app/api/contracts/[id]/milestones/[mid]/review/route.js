export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { saveContract } from '@/lib/store';
import { ok, fail } from '@/lib/contracts';
import { loadMilestone } from '@/lib/milestoneRoute';
import { runReview } from '@/lib/runReview';

export async function POST(_req, { params }) {
  const { contract, milestone, error } = await loadMilestone(params);
  if (error) return error;
  if (!milestone.delivery || !['delivered', 'reviewed'].includes(milestone.status)) return fail('There is no delivery to review.');
  await runReview(contract, milestone);
  saveContract(contract);
  return ok({ contract });
}
