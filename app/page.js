import Link from 'next/link';
import { listContracts } from '@/lib/store';
import { aiInfo } from '@/lib/ai';
import Masthead from '@/components/Masthead';
import NewAgreementForm from '@/components/NewAgreementForm';

export const dynamic = 'force-dynamic';

const STATUS = { draft: 'Waiting for approval', active: 'In progress', completed: 'Closed' };

export default function Home() {
  const contracts = listContracts();
  const total = (c) => c.milestones.reduce((s, m) => s + Number(m.amount), 0);
  return (
    <>
    <div className="band">
      <div className="wrap">
      <Masthead aiLabel={aiInfo().label} />
      <section className="hero">
        <h1>Money moves when the work proves itself.</h1>
        <p>
          Describe the job. ProofPay turns it into milestones with criteria anyone can check, holds each
          payment on the client&rsquo;s card, reviews the delivery against those criteria, and pays out the
          share the evidence supports.
        </p>
      </section>
      </div>
    </div>
    <main className="wrap" style={{ paddingTop: 0 }}>
      <section className="sheet lift">
        <NewAgreementForm />
      </section>

      {contracts.length > 0 && (
        <section>
          <h2>Agreements</h2>
          <ul className="agreements">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.id}`}>
                  <span>
                    <strong>{c.title}</strong>
                    <br />
                    <span className="muted small">{c.clientName} and {c.freelancerName}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="money">${total(c).toFixed(2)}</span>
                    <br />
                    <span className="muted small">{STATUS[c.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
    </>
  );
}
