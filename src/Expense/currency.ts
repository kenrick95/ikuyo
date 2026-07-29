export function formatCurrencyAmount(
  currency: string | null | undefined,
  amount: number | null | undefined,
  useGrouping: boolean = true,
): string {
  if (amount === null || amount === undefined) {
    return '';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 15,
    currency: currency ?? undefined,
    useGrouping,
    signDisplay: 'never',
  });

  return formatter.format(amount);
}
