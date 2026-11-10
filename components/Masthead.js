import Link from 'next/link';

export default function Masthead({ aiLabel }) {
  return (
    <header className="masthead">
      <Link href="/" className="logo"><span className="logo-mark" aria-hidden="true" />ProofPay</Link>
      <div className="badges">
        <span className="badge">Braintree sandbox</span>
        {aiLabel && <span className="badge">Reviewer: {aiLabel}</span>}
      </div>
    </header>
  );
}
