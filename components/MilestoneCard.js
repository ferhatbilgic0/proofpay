'use client';
import { useState } from 'react';
import FundPanel from './FundPanel';
import DeliveryForm from './DeliveryForm';
import SettlePanel from './SettlePanel';
import { money, VERDICT_LABEL } from './format';

const STEPS = ['Agreed', 'Funds held', 'Delivered', 'Reviewed', 'Closed'];
const STEP_INDEX = { awaiting_approval: -1, unfunded: 0, funded: 1, delivered: 2, reviewed: 3, settled: 4, released: 4 };

export default function MilestoneCard({ index, milestone: m, contract, role, act, busy }) {
  const [showRevision, setShowRevision] = useState(false);
  const base = `/milestones/${m.id}`;
  const current = STEP_INDEX[m.status] ?? -1;
  const verdictFor = (cid) => m.review?.verdicts.find((v) => v.criterionId === cid);

  return (
    <article className="sheet stack" aria-labelledby={`ms-${m.id}`}>
      <div className="ms-head">
        <div>
          <span className="muted small">Milestone {index + 1}</span>
          <h3 id={`ms-${m.id}`}>{m.title}</h3>
        </div>
        <span className="money">{money(m.amount)}</span>
      </div>

      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
            {s}
          </li>
        ))}
      </ol>

      {m.description && <p style={{ margin: 0 }}>{m.description}</p>}

      <div>
        <strong className="small">Acceptance criteria</strong>
        <ul className="criteria">
          {m.criteria.map((c) => {
            const v = verdictFor(c.id);
            return (
              <li key={c.id}>
                <span>{c.text}</span>
                {v && <span key={m.review.reviewedAt} className={`stamp stamp-in ${v.verdict}`}>{VERDICT_LABEL[v.verdict]}</span>}
                {v && <span className="evidence">{v.evidence}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {m.delivery && (
        <div className="delivery">
          <strong className="small">
            Delivery{m.delivery.revision > 1 ? `, revision ${m.delivery.revision}` : ''} from {contract.freelancerName}
          </strong>
          {m.delivery.text && <pre style={{ marginTop: 6 }}>{m.delivery.text}</pre>}
          {m.delivery.links?.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {m.delivery.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer">{l}</a></li>)}
            </ul>
          )}
          {m.delivery.image && <img src={m.delivery.image.dataUrl} alt={`Delivered file ${m.delivery.image.name}`} />}
        </div>
      )}

      {m.review && (
        <div className="notice">
          <strong>Reviewer&rsquo;s summary</strong> <span className="small">({m.review.provider})</span>
          <p style={{ margin: '4px 0 0' }}>{m.review.summary}</p>
          {role === 'freelancer' && m.review.notes && <p style={{ margin: '6px 0 0' }}>To close the gaps: {m.review.notes}</p>}
        </div>
      )}

      {m.reviewError && (
        <div className="stack">
          <p className="error" style={{ margin: 0 }}>The review did not finish: {m.reviewError}</p>
          <div><button className="btn-secondary" disabled={!!busy} onClick={() => act(`${base}/review`, {}, `review-${m.id}`)}>
            {busy === `review-${m.id}` ? 'Reviewing…' : 'Run the review again'}
          </button></div>
        </div>
      )}

      {/* Actions depend on who is looking and where the milestone is */}
      {m.status === 'awaiting_approval' && <p className="muted small" style={{ margin: 0 }}>Funding opens once both sides approve.</p>}

      {m.status === 'unfunded' && role === 'client' && (
        <FundPanel amount={m.amount} busy={busy === `fund-${m.id}`} onNonce={(nonce, deviceData) => act(`${base}/fund`, { nonce, deviceData }, `fund-${m.id}`)} />
      )}
      {m.status === 'unfunded' && role === 'freelancer' && (
        <p className="muted" style={{ margin: 0 }}>Waiting for {contract.clientName} to hold the payment. Start work once this shows Funds held.</p>
      )}

      {m.status === 'funded' && role === 'client' && (
        <p className="muted" style={{ margin: 0 }}>
          {money(m.amount)} is held on your card and nothing has been charged. You decide what to pay after the delivery is reviewed.
        </p>
      )}
      {m.status === 'funded' && role === 'freelancer' && (
        <DeliveryForm busy={busy === `deliver-${m.id}`} onSubmit={(payload) => act(`${base}/deliver`, payload, `deliver-${m.id}`)} />
      )}

      {['delivered', 'reviewed'].includes(m.status) && role === 'client' && (m.review || m.reviewError) && (
        <SettlePanel milestone={m} busy={busy} onSettle={(mode, amount) => act(`${base}/settle`, { mode, amount }, `settle-${m.id}`)} />
      )}
      {['delivered', 'reviewed'].includes(m.status) && role === 'freelancer' && (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>Waiting for {contract.clientName} to decide. You can send a revision; it gets reviewed again.</p>
          {showRevision ? (
            <DeliveryForm busy={busy === `deliver-${m.id}`} onSubmit={async (p) => { if (await act(`${base}/deliver`, p, `deliver-${m.id}`)) setShowRevision(false); }} />
          ) : (
            <div><button className="btn-secondary" onClick={() => setShowRevision(true)}>Send a revision</button></div>
          )}
        </div>
      )}

      {['settled', 'released'].includes(m.status) && (
        <div className="receipt">
          <strong>{m.status === 'released' ? 'Hold released, nothing charged' : `Paid ${money(m.settlement.amount)} of ${money(m.amount)}`}</strong>
          <dl>
            <dt>Decision</dt>
            <dd>
              {m.settlement.mode === 'full' && 'Paid in full'}
              {m.settlement.mode === 'partial' && 'Partial payment'}
              {m.settlement.mode === 'release' && 'Released'}
              {m.settlement.suggestedAmount != null && `, reviewer suggested ${money(m.settlement.suggestedAmount)}`}
            </dd>
            <dt>Braintree transaction</dt>
            <dd>{m.transaction.id}</dd>
            <dt>Status</dt>
            <dd>{m.transaction.status.replace(/_/g, ' ')}</dd>
          </dl>
          <button className="btn-link small" style={{ marginTop: 10 }} disabled={!!busy} onClick={() => act(`${base}/refresh`, {}, `refresh-${m.id}`)}>
            {busy === `refresh-${m.id}` ? 'Checking…' : 'Check status with Braintree'}
          </button>
        </div>
      )}

      {m.transaction && !['settled', 'released'].includes(m.status) && (
        <p className="small muted" style={{ margin: 0 }}>
          Braintree transaction {m.transaction.id}: {m.transaction.status.replace(/_/g, ' ')}
          {m.transaction.last4 ? `, card ending ${m.transaction.last4}` : ''}
        </p>
      )}
    </article>
  );
}
