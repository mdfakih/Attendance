interface Owed {
  readonly total: string;
  readonly amountPaid: string;
}

/** Amount still owed on a charge, computed in paise so "1000.00 − 398.93" is "601.07", not float noise. */
export function balanceDue(charge: Owed): string {
  const paise = Math.round(Number(charge.total) * 100) - Math.round(Number(charge.amountPaid) * 100);
  return (Math.max(0, paise) / 100).toFixed(2);
}
