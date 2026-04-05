const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
  return integerFormatter.format(value);
}