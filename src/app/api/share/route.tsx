import { ImageResponse } from 'next/og';
import RoundResultCard from '@/lib/share/cards/round-result';
import LeaderboardRankCard from '@/lib/share/cards/leaderboard-rank';
import WeeklyChampionsCard from '@/lib/share/cards/weekly-champions';
import MilestoneBadgeCard from '@/lib/share/cards/milestone-badge';
import StatsSummaryCard from '@/lib/share/cards/stats-summary';
import DailySummaryCard from '@/lib/share/cards/daily-summary';
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '@/lib/constants/share-card';
import { getShareCardFonts } from '@/lib/share/fonts';
import { parseShareCardRequest } from '@/lib/share/request';
import { createShareCardPalette } from '@/lib/share/theme';

export const runtime = 'nodejs';

async function fetchImageAsDataUrl(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    const response = await fetch(parsed, {
      signal: AbortSignal.timeout(4_000),
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  } catch {
    return null;
  }
}

function buildInvalidRequestResponse() {
  return Response.json({ error: 'invalid_request' }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const parsedRequest = parseShareCardRequest(searchParams);

  if (!parsedRequest) {
    return buildInvalidRequestResponse();
  }

  const fontsPromise = getShareCardFonts();
  const palette = createShareCardPalette(parsedRequest.themeName);

  if (parsedRequest.type === 'round-result') {
    const imageSrc = await fetchImageAsDataUrl(parsedRequest.imageUrl);
    const fonts = await fontsPromise;

    return new ImageResponse(
      (
        <RoundResultCard
          birdName={parsedRequest.birdName}
          scientificName={parsedRequest.scientificName}
          isReal={parsedRequest.isReal}
          isCorrect={parsedRequest.isCorrect}
          imageSrc={imageSrc}
          streak={parsedRequest.streak}
          fieldNote={parsedRequest.fieldNote}
          origin={origin}
          palette={palette}
        />
      ),
      {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts,
      }
    );
  }

  if (parsedRequest.type === 'leaderboard-rank') {
    const fonts = await fontsPromise;

    return new ImageResponse(
      (
        <LeaderboardRankCard
          challengeName={parsedRequest.challengeName}
          rank={parsedRequest.rank}
          score={parsedRequest.score}
          isFinal={parsedRequest.isFinal}
          username={parsedRequest.username}
          origin={origin}
          palette={palette}
        />
      ),
      {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts,
      }
    );
  }

  if (parsedRequest.type === 'weekly-champions') {
    const fonts = await fontsPromise;

    return new ImageResponse(
      (
        <WeeklyChampionsCard
          username={parsedRequest.username}
          gold={parsedRequest.gold}
          silver={parsedRequest.silver}
          bronze={parsedRequest.bronze}
          origin={origin}
          palette={palette}
        />
      ),
      {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts,
      }
    );
  }

  if (parsedRequest.type === 'milestone-badge') {
    const fonts = await fontsPromise;

    return new ImageResponse(
      (
        <MilestoneBadgeCard
          badgeName={parsedRequest.badgeName}
          birdsIdentified={parsedRequest.birdsIdentified}
          milestoneValue={parsedRequest.milestoneValue}
          description={parsedRequest.description}
          origin={origin}
          palette={palette}
        />
      ),
      {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts,
      }
    );
  }

  if (parsedRequest.type === 'stats-summary') {
    const fonts = await fontsPromise;

    return new ImageResponse(
      (
        <StatsSummaryCard
          username={parsedRequest.username}
          bestStreak={parsedRequest.bestStreak}
          currentStreak={parsedRequest.currentStreak}
          bestDailyStreak={parsedRequest.bestDailyStreak}
          currentDailyStreak={parsedRequest.currentDailyStreak}
          birdsIdentified={parsedRequest.birdsIdentified}
          accuracy={parsedRequest.accuracy}
          seeds={parsedRequest.seeds}
          bestWeeklyPlacement={parsedRequest.bestWeeklyPlacement}
          origin={origin}
          palette={palette}
        />
      ),
      {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts,
      }
    );
  }

  if (parsedRequest.type === 'daily-summary') {
    const fonts = await fontsPromise;

    return new ImageResponse(
      (
        <DailySummaryCard
          currentStreak={parsedRequest.currentStreak}
          completedCount={parsedRequest.completedCount}
          rewardedCount={parsedRequest.rewardedCount}
          missionCount={parsedRequest.missionCount}
          origin={origin}
          palette={palette}
        />
      ),
      {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts,
      }
    );
  }

  return buildInvalidRequestResponse();
}