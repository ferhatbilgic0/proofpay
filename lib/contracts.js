export function addEvent(contract, actor, text) {
  contract.events = contract.events || [];
  contract.events.push({ at: new Date().toISOString(), actor, text });
}

export function findMilestone(contract, mid) {
  return contract.milestones.find((m) => m.id === mid) || null;
}

export const ok = (data) => Response.json(data);
export const fail = (error, status = 400) => Response.json({ error }, { status });

// Turns per-criterion verdicts into a suggested payout. The weights are fixed and shown
// in the UI, so the number is explainable rather than a model's guess.
export const WEIGHTS = { met: 1, unclear: 0.5, not_met: 0 };

export function scoreReview(criteria, verdicts, amount) {
  const counts = { met: 0, unclear: 0, not_met: 0 };
  let total = 0;
  for (const c of criteria) {
    const v = verdicts.find((x) => x.criterionId === c.id)?.verdict || 'unclear';
    counts[v] += 1;
    total += WEIGHTS[v];
  }
  const ratio = criteria.length ? total / criteria.length : 0;
  return { counts, ratio, suggestedAmount: Math.round(Number(amount) * ratio * 100) / 100 };
}
