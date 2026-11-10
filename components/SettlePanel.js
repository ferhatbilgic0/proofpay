'use client';
import { useState } from 'react';
import { money } from './format';

export default function SettlePanel({ milestone: m, busy, onSettle }) {
  const held = Number(m.amount);
  const review = m.review;
  const suggested = review ? review.suggestedAmount : held;
  const [amount, setAmount] = useState(suggested.toFixed(2));
  const pct = Math.max(0, Math.min(100, (Number(amount) / held) * 100 || 0));
  const working = busy === `settle-${m.id}`;

  function confirmAnd(mode, value, message) {
    if (window.confirm(message)) onSettle(mode, value);
  }

  return (
    <div className="stack">
      <h3>Decide the payout</h3>
      {review ? (
        <p style={{ margin: 0 }}>
          {review.counts.met} met, {review.counts.unclear} unclear, {review.counts.not_met} not met. The reviewer suggests{' '}
          <span className="money">{money(suggested)}</span>, {Math.round(review.ratio * 100)}% of the hold. Each met criterion counts
          fully, an unclear one counts half.
        </p>
      ) : (
        <p style={{ margin: 0 }}>There is no review yet, so there is no suggestion. You can still pay in full or release the hold.</p>
      )}

      <div>
        <div className="meter" role="img" aria-label={`Paying ${money(amount)} of ${money(held)} held`}>
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="meter-legend">
          <span>Pay <span className="money">{money(amount)}</span></span>
          <span className="muted">Held {money(held)}</span>
        </div>
      </div>

      {review && (
        <div className="row">
          <label htmlFor={`amt-${m.id}`} style={{ margin: 0 }}>Amount to pay</label>
          <input id={`amt-${m.id}`} type="number" min="0.01" max={held} step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} style={{ maxWidth: 140 }} />
          {Number(amount) !== suggested && (
            <button type="button" className="btn-link" onClick={() => setAmount(suggested.toFixed(2))}>Use the suggestion</button>
          )}
        </div>
      )}

      <div className="row">
        {review && Number(amount) > 0 && Number(amount) < held && (
          <button className="btn-primary" disabled={working}
            onClick={() => confirmAnd('partial', Number(amount), `Pay ${money(amount)} and release the remaining ${money(held - Number(amount))}?`)}>
            {working ? 'Settling…' : `Pay ${money(amount)}`}
          </button>
        )}
        <button className={review && Number(amount) < held ? 'btn-secondary' : 'btn-primary'} disabled={working}
          onClick={() => confirmAnd('full', held, `Pay the full ${money(held)}?`)}>
          Pay in full
        </button>
        <button className="btn-danger" disabled={working}
          onClick={() => confirmAnd('release', 0, 'Release the hold? Nothing will be charged and the freelancer is not paid.')}>
          Release the hold
        </button>
      </div>
    </div>
  );
}
