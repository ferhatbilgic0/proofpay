export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { saveContract } from '@/lib/store';
import { gateway, toMoney } from '@/lib/braintree';
import { addEvent, ok, fail } from '@/lib/contracts';
import { loadMilestone } from '@/lib/milestoneRoute';

// full: capture the whole hold. partial: capture less than the hold (Braintree releases the rest).
// release: void the authorization so nothing is charged.
export async function POST(req, { params }) {
  const { contract, milestone, error } = await loadMilestone(params);
  if (error) return error;
  if (!['delivered', 'reviewed'].includes(milestone.status)) return fail('This milestone has nothing to settle yet.');
  if (!milestone.transaction?.id) return fail('This milestone has no held payment.');
  const { mode, amount } = await req.json().catch(() => ({}));
  const held = Number(milestone.amount);
  const txId = milestone.transaction.id;

  try {
    let result;
    let settledAmount = 0;
    if (mode === 'release') {
      result = await gateway().transaction.void(txId);
    } else if (mode === 'full' || mode === 'partial') {
      settledAmount = mode === 'full' ? held : Math.round(Number(amount) * 100) / 100;
      if (!(settledAmount > 0) || settledAmount > held) {
        return fail(`Enter an amount between $0.01 and $${held.toFixed(2)}.`);
      }
      result = await gateway().transaction.submitForSettlement(txId, toMoney(settledAmount));
    } else {
      return fail('Choose full, partial or release.');
    }
    if (!result.success) return fail(`Braintree refused the request: ${result.message}`, 402);

    milestone.transaction.status = result.transaction.status;
    milestone.settlement = {
      mode: mode === 'release' ? 'release' : settledAmount < held ? 'partial' : 'full',
      amount: settledAmount,
      suggestedAmount: milestone.review?.suggestedAmount ?? null,
      at: new Date().toISOString(),
    };
    milestone.status = mode === 'release' ? 'released' : 'settled';
    addEvent(
      contract,
      'client',
      mode === 'release'
        ? `Released the hold on "${milestone.title}". Nothing was charged.`
        : `Paid $${settledAmount.toFixed(2)} of $${held.toFixed(2)} for "${milestone.title}". Braintree status: ${result.transaction.status}.`
    );
    if (contract.milestones.every((m) => ['settled', 'released'].includes(m.status))) {
      contract.status = 'completed';
      addEvent(contract, 'agent', 'All milestones are closed.');
    }
    saveContract(contract);
    return ok({ contract });
  } catch (e) {
    return fail(e.message, 500);
  }
}
