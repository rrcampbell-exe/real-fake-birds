export function percentOfTime(percent: number): boolean {
  return Math.floor(Math.random() * 100) <= percent - 1;
}
