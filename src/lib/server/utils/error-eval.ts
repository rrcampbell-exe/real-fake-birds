export function errorEval(response: (string | { error: string })[]): boolean {
  return response.some(
    (item) => typeof item === 'object' && item !== null && 'error' in item
  );
}
