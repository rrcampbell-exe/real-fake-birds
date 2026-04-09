export function getTodayMissionDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftMissionDate(date: string, dayDelta: number): string {
  const [year, month, day] = date.split('-').map((value) => Number.parseInt(value, 10));
  const cursor = new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
  cursor.setDate(cursor.getDate() + dayDelta);
  return getTodayMissionDate(cursor);
}

export function getNextMissionMidnightDelayMs(now = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    50
  );
  return Math.max(nextMidnight.getTime() - now.getTime(), 50);
}