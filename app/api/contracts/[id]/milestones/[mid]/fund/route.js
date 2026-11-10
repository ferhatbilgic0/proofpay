export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { saveContract } from '@/lib/store';
import { gateway, toMoney, summarizeTransaction } from '@/lib/braintree';
import { addEvent, ok, fail } from '@/lib/contracts';
import { loadMilestone } from '@/lib/milestoneRoute';

// Authorizes (holds) the milestone amount on the client's payment method without capturing it.
export async function POST(req, { params }) {
  const { contract, milestone, error } = await loadMilestone(params);
  if (error) return error;
  if (milestone.status !== 'unfunded') return fail('This milestone is not waiting for funding.');
  const { nonce, deviceData } = await req.json().catch(() => ({}));
  if (!nonce) return fail('No payment method was received from the payment form.');

  try {
    const result = await gateway().transaction.sale({
      amount: toMoney(milestone.amount),
      paymentMethodNonce: nonce,
      deviceData,
      orderId: `${contract.id}-${milestone.id}`,
      options: { submitForSettlement: false },
    });
    if (!result.success) return fail(`Braintree did not authorize the payment: ${result.message}`, 402);
    milestone.transaction = summarizeTransaction(result.transaction);
    milestone.status = 'funded';
    addEvent(contract, 'client', `Held $${result.transaction.amount} for "${milestone.title}". Braintree transaction ${result.transaction.id} is ${result.transaction.status}.`);
    saveContract(contract);
    return ok({ contract });
  } catch (e) {
    return fail(e.message, 500);
  }
}
