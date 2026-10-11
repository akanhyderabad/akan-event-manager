export const MAX_WALLET_AMOUNT_INR = 100000;

export function parseMoneyInput(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100) / 100;
}

export function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

export function isValidNonNegativeMoney(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && hasAtMostTwoDecimals(value);
}
