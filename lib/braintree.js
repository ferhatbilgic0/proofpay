import braintree from 'braintree';

let cached;

export function gateway() {
  if (cached) return cached;
  const { BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, BRAINTREE_PRIVATE_KEY } = process.env;
  if (!BRAINTREE_MERCHANT_ID || !BRAINTREE_PUBLIC_KEY || !BRAINTREE_PRIVATE_KEY) {
    throw new Error('Braintree keys are missing. Add BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY and BRAINTREE_PRIVATE_KEY to .env');
  }
  cached = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: BRAINTREE_MERCHANT_ID,
    publicKey: BRAINTREE_PUBLIC_KEY,
    privateKey: BRAINTREE_PRIVATE_KEY,
  });
  return cached;
}

export const toMoney = (n) => Number(n).toFixed(2);

export function summarizeTransaction(t) {
  return {
    id: t.id,
    status: t.status,
    amount: t.amount,
    instrument: t.paymentInstrumentType,
    last4: t.creditCard?.last4 || null,
    cardType: t.creditCard?.cardType || null,
  };
}
