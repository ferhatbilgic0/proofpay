'use client';
import { useState } from 'react';
import Link from 'next/link';
import MilestoneCard from './MilestoneCard';
import { money } from './format';

export default function AgreementView({ initial }) {
  const [contract, setContract] = useState(initial);
  const [role, setRole] = useState('client');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // Every action posts to an API route and gets the updated agreement back.
  async function act(path, body, key) {
    setBusy(key || path);
    setError('');
    try {
      const res = await fetch(`/api/contracts/${contract.id}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContract(data.contract);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy('');
    }
  }

  const total = contract.milestones.reduce((s, m) => s + Number(m.amount), 0);
  const name = role === 'client' ? contract.clientName : contract.freelancerName;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <Link href="/" className="small">All agreements</Link>
        <div className="role-switch" role="group" aria-label="View the agreement as">
          <button aria-pressed={role === 'client'} onClick={() => setRole('client')}>Client view</button>
          <button aria-pressed={role === 'freelancer'} onClick={() => setRole('freelancer')}>Freelancer view</button>
        </div>
      </div>

      <section className="stack">
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', fontVariationSettings: "'wdth' 112" }}>{contract.title}</h1>
        {contract.summary && <p style={{ margin: 0, maxWidth: '62ch' }}>{contract.summary}</p>}
        <p className="muted" style={{ margin: 0 }}>
          {contract.clientName} pays {contract.freelancerName} up to <span className="money">{money(total)}</span> across{' '}
          {contract.milestones.length} milestones. You are viewing as {name}.
        </p>
      </section>

      {error && <p className="error" role="alert" style={{ marginTop: 20 }}>{error}</p>}

      {contract.status === 'draft' && (
        <section className="sheet stack">
          <h2>Agree on what “done” means</h2>
          <p className="muted" style={{ margin: 0 }}>
            The agent drafted these milestones from the brief. Both sides approve them before any money is held, so the
            review later checks against criteria you both accepted.
          </p>
          {contract.assumptions?.length > 0 && (
            <div className="notice">
              <strong>Open points to settle first</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {contract.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          <div className="row">
            {['client', 'freelancer'].map((r) => (
              <span key={r} className="badge">
                {r === 'client' ? contract.clientName : contract.freelancerName}: {contract.approvals[r] ? 'approved' : 'not yet'}
              </span>
            ))}
          </div>
          <div>
            <button
              className="btn-primary"
              disabled={contract.approvals[role] || busy === 'approve'}
              onClick={() => act('/approve', { role }, 'approve')}
            >
              {contract.approvals[role] ? `Approved as ${name}` : `Approve as ${name}`}
            </button>
          </div>
          {contract.approvals[role] && !(contract.approvals.client && contract.approvals.freelancer) && (
            <p className="small muted" style={{ margin: 0 }}>Switch to the other view above to approve for the other side.</p>
          )}
        </section>
      )}

      <section className="stack">
        {contract.milestones.map((m, i) => (
          <MilestoneCard key={m.id} index={i} milestone={m} contract={contract} role={role} act={act} busy={busy} />
        ))}
      </section>

      <section>
        <h2>Activity</h2>
        <ol className="log">
          {[...contract.events].reverse().map((e, i) => (
            <li key={i}>
              <span className="who">{e.actor}</span>
              <span>
                {e.text}
                <br />
                <span className="muted small">{new Date(e.at).toLocaleString()}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
