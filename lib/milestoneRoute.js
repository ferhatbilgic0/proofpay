import { getContract } from '@/lib/store';
import { findMilestone, fail } from '@/lib/contracts';

// Loads the agreement and milestone for a /milestones/[mid]/... route, or returns an error response.
export async function loadMilestone(params) {
  const { id, mid } = await params;
  const contract = getContract(id);
  if (!contract) return { error: fail('Agreement not found.', 404) };
  const milestone = findMilestone(contract, mid);
  if (!milestone) return { error: fail('Milestone not found.', 404) };
  return { contract, milestone };
}
