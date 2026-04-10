import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor() {
      super('png', {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      });
    }
  },
}));

import { GET } from './route';

describe('share route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a png for leaderboard rank cards', async () => {
    const response = await GET(
      new Request('http://localhost/api/share?type=leaderboard-rank&challengeName=Seed%20Collector&username=BirdFan&rank=3&score=42&isFinal=false') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('returns a png for weekly champion cards', async () => {
    const response = await GET(
      new Request('http://localhost/api/share?type=weekly-champions&username=BirdFan&gold=2&silver=1&bronze=0') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('returns a png for round result cards without an image', async () => {
    const response = await GET(
      new Request('http://localhost/api/share?type=round-result&birdName=Blue%20Robin&scientificName=Cyanocitta%20cristata&isReal=true&isCorrect=true&streak=4&fieldNote=Recently%20seen%20in%20Algeria') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('returns a png for milestone badge cards', async () => {
    const response = await GET(
      new Request('http://localhost/api/share?type=milestone-badge&badgeName=Downy%20Feather&birdsIdentified=10&milestoneValue=10&description=Your%20first%20feather') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('returns a png for stats summary cards', async () => {
    const response = await GET(
      new Request('http://localhost/api/share?type=stats-summary&username=BirdFan&bestStreak=8&currentStreak=2&bestDailyStreak=4&currentDailyStreak=1&birdsIdentified=33&accuracy=67&seeds=120&bestWeeklyPlacement=%232') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('returns a png for daily summary cards', async () => {
    const response = await GET(
      new Request('http://localhost/api/share?type=daily-summary&currentStreak=3&completedCount=2&rewardedCount=1&missionCount=3') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('rejects invalid requests', async () => {
    const response = await GET(new Request('http://localhost/api/share?type=leaderboard-rank&rank=2') as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });
});