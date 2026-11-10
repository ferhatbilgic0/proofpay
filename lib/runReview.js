import { reviewDelivery, aiInfo } from '@/lib/ai';
import { addEvent, scoreReview } from '@/lib/contracts';

export async function runReview(contract, milestone) {
  try {
    const review = await reviewDelivery({ milestone, delivery: milestone.delivery });
    const score = scoreReview(milestone.criteria, review.verdicts, milestone.amount);
    milestone.review = { ...review, ...score, provider: aiInfo().label, reviewedAt: new Date().toISOString() };
    milestone.reviewError = null;
    milestone.status = 'reviewed';
    const { met, unclear, not_met } = score.counts;
    addEvent(contract, 'agent', `Reviewed "${milestone.title}": ${met} met, ${unclear} unclear, ${not_met} not met. Suggested payout $${score.suggestedAmount.toFixed(2)}.`);
  } catch (e) {
    milestone.review = null;
    milestone.reviewError = e.message;
    milestone.status = 'delivered';
    addEvent(contract, 'agent', `Review failed: ${e.message}`);
  }
}
