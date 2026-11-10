export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

export const VERDICT_LABEL = { met: 'Met', not_met: 'Not met', unclear: 'Unclear' };
