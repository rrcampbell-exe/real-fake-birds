import ShareCardFrame from '@/lib/share/card-base';
import type { ShareCardPalette } from '@/lib/share/theme';

interface LeaderboardRankCardProps {
  challengeName: string;
  rank: number;
  score: string;
  isFinal: boolean;
  username: string;
  origin: string;
  palette: ShareCardPalette;
}

export default function LeaderboardRankCard({
  challengeName,
  rank,
  score,
  isFinal,
  username,
  origin,
  palette,
}: LeaderboardRankCardProps) {
  return (
    <ShareCardFrame
      eyebrow="Weekly Leaderboard"
      title={`${username} is #${rank}`}
      subtitle={`${isFinal ? 'Final result' : 'Current position'} in ${challengeName}. ${score} on the board so far.`}
      origin={origin}
      palette={palette}
    >
      <div style={{ display: 'flex', flex: 1, gap: 28 }}>
        <div
          style={{
            display: 'flex',
            flex: 1.1,
            padding: 30,
            borderRadius: 32,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: palette.accent, fontSize: 20, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase' }}>
              Challenge
            </div>
            <div style={{ display: 'flex', marginTop: 14, fontSize: 44, fontWeight: 800, lineHeight: 1.1, fontFamily: 'Fredoka' }}>
              {challengeName}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 22, borderRadius: 24, backgroundColor: palette.surfaceMuted }}>
              <div style={{ display: 'flex', fontSize: 18, color: palette.mutedText, textTransform: 'uppercase', letterSpacing: 1.2 }}>Status</div>
              <div style={{ display: 'flex', marginTop: 10, fontSize: 30, fontWeight: 800 }}>{isFinal ? 'Final' : 'Live'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 22, borderRadius: 24, backgroundColor: palette.surfaceMuted }}>
              <div style={{ display: 'flex', fontSize: 18, color: palette.mutedText, textTransform: 'uppercase', letterSpacing: 1.2 }}>Score</div>
              <div style={{ display: 'flex', marginTop: 10, fontSize: 30, fontWeight: 800 }}>{score}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: 320,
            borderRadius: 36,
            backgroundColor: palette.accent,
            color: palette.accentText,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase' }}>Rank</div>
          <div style={{ display: 'flex', marginTop: 8, fontSize: 156, fontWeight: 900, lineHeight: 1, fontFamily: 'Fredoka' }}>#{rank}</div>
          <div style={{ display: 'flex', marginTop: 4, fontSize: 28, fontWeight: 700 }}>{username}</div>
        </div>
      </div>
    </ShareCardFrame>
  );
}