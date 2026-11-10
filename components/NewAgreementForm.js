'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLE = {
  clientName: 'Marta (Forno Azul bakery)',
  freelancerName: 'Deniz',
  budget: '400',
  brief:
    'I run a small bakery in Lisbon called Forno Azul and need a new logo. First, show me three different logo concepts so I can pick one. ' +
    'Then deliver the chosen logo as SVG and PNG files with a transparent background, plus a one-color version we can use as a stamp on our paper bags. ' +
    'Our colors are deep blue and cream.',
};

export default function NewAgreementForm() {
  const router = useRouter();
  const [form, setForm] = useState({ clientName: '', freelancerName: '', budget: '', brief: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/c/${data.contract.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Start an agreement</h2>
        <button type="button" className="btn-link" onClick={() => setForm(EXAMPLE)}>Fill in an example</button>
      </div>
      <div className="grid-3">
        <div>
          <label htmlFor="clientName">Client</label>
          <input id="clientName" type="text" value={form.clientName} onChange={set('clientName')} placeholder="Who pays" />
        </div>
        <div>
          <label htmlFor="freelancerName">Freelancer</label>
          <input id="freelancerName" type="text" value={form.freelancerName} onChange={set('freelancerName')} placeholder="Who delivers" />
        </div>
        <div>
          <label htmlFor="budget">Budget in USD</label>
          <input id="budget" type="number" min="1" step="1" value={form.budget} onChange={set('budget')} placeholder="400" />
        </div>
      </div>
      <div>
        <label htmlFor="brief">What needs to be done?</label>
        <textarea id="brief" value={form.brief} onChange={set('brief')} placeholder="Write it the way you would message a freelancer." />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? 'Drafting milestones…' : 'Draft milestones'}
      </button>
    </form>
  );
}
