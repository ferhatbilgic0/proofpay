'use client';
import { useEffect, useRef, useState } from 'react';
import { money } from './format';

// Braintree Drop-in collects the card and returns a one-time nonce; the server then authorizes the amount.
export default function FundPanel({ amount, busy, onNonce }) {
  const container = useRef(null);
  const instance = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/braintree/client-token');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const dropin = (await import('braintree-web-drop-in')).default;
        if (cancelled) return;
        instance.current = await dropin.create({
          authorization: data.clientToken,
          container: container.current,
          dataCollector: true,
          card: { cardholderName: { required: false } },
        });
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
      instance.current?.teardown().catch(() => {});
      instance.current = null;
    };
  }, []);

  async function hold() {
    setError('');
    try {
      const { nonce, deviceData } = await instance.current.requestPaymentMethod();
      const okay = await onNonce(nonce, deviceData);
      if (!okay) instance.current?.clearSelectedPaymentMethod();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="stack">
      <p style={{ margin: 0 }}>
        Hold {money(amount)} on your card. Nothing is charged until you approve the delivery.
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        Sandbox test card: 4111 1111 1111 1111, any future expiry date, any CVV.
      </p>
      <div ref={container} className="dropin" />
      {error && <p className="error" role="alert">{error}</p>}
      <div>
        <button className="btn-primary" disabled={!ready || busy} onClick={hold}>
          {busy ? 'Holding…' : `Hold ${money(amount)}`}
        </button>
      </div>
    </div>
  );
}
