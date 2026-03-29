export function localStorageCheck(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('birdScore'));
}
