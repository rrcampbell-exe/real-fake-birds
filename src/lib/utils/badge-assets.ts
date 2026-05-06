export function toBadgeAssetName(badgeName: string): string {
  return badgeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}