export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getContract, saveContract } from '@/lib/store';
import { addEvent, ok, fail } from '@/lib/contracts';

export async function POST(req, { params }) {
  const { id } = await params;
  const contract = getContract(id);
  if (!contract) return fail('Agreement not found.', 404);
  if (contract.status !== 'draft') return fail('This agreement is already active.');
  const { role } = await req.json().catch(() => ({}));
  if (!['client', 'freelancer'].includes(role)) return fail('Role must be client or freelancer.');

  contract.approvals[role] = true;
  addEvent(contract, role, 'Approved the milestones and criteria.');
  if (contract.approvals.client && contract.approvals.freelancer) {
    contract.status = 'active';
    contract.milestones.forEach((m) => { m.status = 'unfunded'; });
    addEvent(contract, 'agent', 'Both sides approved. Milestones are open for funding.');
  }
  saveContract(contract);
  return ok({ contract });
}
