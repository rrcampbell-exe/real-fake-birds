/**
 * Formats a UTC ISO timestamp as a locale-safe "Month Year" string
 * for display in profile joined dates.
 *
 * Uses the UTC calendar month so the result is deterministic regardless
 * of the viewer's local timezone.
 *
 * @example formatJoinedMonthYear('2026-04-03T12:00:00Z') // "April 2026"
 */
export function formatJoinedMonthYear(createdAt: string): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
