export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { listContracts, saveContract, newId } from '@/lib/store';
import { draftContract, aiInfo } from '@/lib/ai';
import { addEvent, ok, fail } from '@/lib/contracts';

export async function GET() {
  return ok({ contracts: listContracts(), ai: aiInfo() });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const brief = String(body.brief || '').trim();
  const budget = body.budget ? Number(body.budget) : null;
  if (brief.length < 30) return fail('Describe the job in at least a couple of sentences so the agent can find milestones.');
  if (budget !== null && (!Number.isFinite(budget) || budget <= 0)) return fail('Budget must be a positive number.');

  let draft;
  try {
    draft = await draftContract(brief, { budget });
  } catch (e) {
    return fail(`The agent could not draft milestones: ${e.message}`, 502);
  }

  const rawMilestones = (draft.milestones || []).filter((m) => m && m.title).slice(0, 4);
  if (!rawMilestones.length) return fail('The agent returned no milestones. Try a more specific brief.', 502);

  // Make the amounts add up to the stated budget even if the model is slightly off.
  let amounts = rawMilestones.map((m) => Math.max(1, Number(m.amount) || 0));
  if (budget) {
    const sum = amounts.reduce((a, b) => a + b, 0);
    amounts = amounts.map((a) => Math.round((a / sum) * budget * 100) / 100);
    const drift = Math.round((budget - amounts.reduce((a, b) => a + b, 0)) * 100) / 100;
    amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + drift) * 100) / 100;
  }

  const contract = {
    id: newId('agr'),
    createdAt: new Date().toISOString(),
    title: String(draft.title || 'Untitled agreement').slice(0, 120),
    summary: String(draft.summary || '').slice(0, 400),
    brief,
    currency: 'USD',
    clientName: String(body.clientName || 'Client').slice(0, 60),
    freelancerName: String(body.freelancerName || 'Freelancer').slice(0, 60),
    assumptions: (draft.assumptions || []).map(String).slice(0, 3),
    status: 'draft',
    approvals: { client: false, freelancer: false },
    aiProvider: aiInfo().label,
    milestones: rawMilestones.map((m, i) => ({
      id: newId('ms'),
      title: String(m.title).slice(0, 120),
      description: String(m.description || '').slice(0, 300),
      amount: amounts[i],
      criteria: (m.criteria || []).map(String).filter(Boolean).slice(0, 5).map((text, j) => ({ id: `c${j + 1}`, text })),
      status: 'awaiting_approval',
    })),
    events: [],
  };
  addEvent(contract, 'agent', `Drafted ${contract.milestones.length} milestones from the brief.`);
  saveContract(contract);
  return ok({ contract });
}
