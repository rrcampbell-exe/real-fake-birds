export function formatBirdName(name: string): string {
  const normalized = name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || name.trim();
}