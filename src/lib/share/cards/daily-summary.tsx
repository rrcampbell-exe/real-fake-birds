import ShareCardFrame from '@/lib/share/card-base';
import type { ShareCardPalette } from '@/lib/share/theme';

interface DailySummaryCardProps {
  currentStreak: number;
  completedCount: number;
  rewardedCount: number;
  missionCount: number;
  origin: string;
  palette: ShareCardPalette;
}

function SummaryTile({
  label,
  value,
  hint,
  palette,
}: {
  label: string;
  value: string;
  hint: string;
  palette: ShareCardPalette;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: 24,
        borderRadius: 28,
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: palette.mutedText }}>{label}</div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 58, fontWeight: 900, fontFamily: 'Fredoka' }}>{value}</div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 20, lineHeight: 1.35, color: palette.mutedText }}>{hint}</div>
    </div>
  );
}

export default function DailySummaryCard({
  currentStreak,
  completedCount,
  rewardedCount,
  missionCount,
  origin,
  palette,
}: DailySummaryCardProps) {
  return (
    <ShareCardFrame
      eyebrow="Daily Missions"
      title="Keep the streak alive"
      subtitle="Today's mission board in one image, ready to send to the flock."
      origin={origin}
      palette={palette}
    >
      <div style={{ display: 'flex', flex: 1, gap: 20 }}>
        <SummaryTile label="Current Streak" value={String(currentStreak)} hint="Consecutive mission days completed" palette={palette} />
        <SummaryTile label="Today" value={`${completedCount}/${missionCount}`} hint="Mission cards completed so far" palette={palette} />
        <SummaryTile label="Rewards Paid" value={String(rewardedCount)} hint="Rewards already claimed from today's mission board" palette={palette} />
      </div>
    </ShareCardFrame>
  );
}