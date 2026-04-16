/**
 * Convert a bird common name to a URL-safe slug for CDN paths.
 *
 * Uses the same normalisation logic as {@link deriveBirdKey} in bird-journal.ts
 * (strip non-alphanumeric, lowercase, hyphenate) but without the `real:`/`fake:` prefix.
 */
export function slugifyBirdName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return slug || 'unknown-bird';
}
