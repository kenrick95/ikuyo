export function formatCurrencyAmount(
  currency: string | null | undefined,
  amount: number | null | undefined,
  forDisplay: boolean = true,
): string {
  if (amount === null || amount === undefined) {
    return '';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: forDisplay ? 11 : 15,
    currency: currency ?? undefined,
    useGrouping: forDisplay,
    signDisplay: 'never',
  });

  return formatter.format(amount);
}
