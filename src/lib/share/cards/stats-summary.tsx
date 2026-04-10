import type { ReactNode } from 'react';
import SeedIcon from '@/components/icons/SeedIcon';
import ShareCardFrame from '@/lib/share/card-base';
import type { ShareCardPalette } from '@/lib/share/theme';

interface StatsSummaryCardProps {
  username: string;
  bestStreak: number;
  currentStreak: number;
  bestDailyStreak: number;
  currentDailyStreak: number;
  birdsIdentified: number;
  accuracy: number;
  seeds: number;
  bestWeeklyPlacement: string;
  origin: string;
  palette: ShareCardPalette;
}

function StatTile({
  label,
  value,
  palette,
  icon,
}: {
  label: string;
  value: string;
  palette: ShareCardPalette;
  icon?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 118,
        flex: 1,
        padding: 18,
        borderRadius: 24,
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: 16, color: palette.mutedText, textTransform: 'uppercase', letterSpacing: 1.1 }}>{label}</div>
        {icon ? <div style={{ display: 'flex' }}>{icon}</div> : null}
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 42, fontWeight: 900, fontFamily: 'Fredoka' }}>{value}</div>
    </div>
  );
}

export default function StatsSummaryCard({
  username,
  bestStreak,
  currentStreak,
  bestDailyStreak,
  currentDailyStreak,
  birdsIdentified,
  accuracy,
  seeds,
  bestWeeklyPlacement,
  origin,
  palette,
}: StatsSummaryCardProps) {
  return (
    <ShareCardFrame
      eyebrow="Personal Bests"
      title={`${username}'s bird log`}
      subtitle="A snapshot of streaks, accuracy, and the size of the collection so far."
      origin={origin}
      palette={palette}
    >
      <div style={{ display: 'flex', flex: 1, gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          <StatTile label="Best Guess Streak" value={String(bestStreak)} palette={palette} />
          <StatTile label="Current Guess Streak" value={String(currentStreak)} palette={palette} />
          <StatTile label="Best Daily Streak" value={String(bestDailyStreak)} palette={palette} />
          <StatTile label="Current Daily Streak" value={String(currentDailyStreak)} palette={palette} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          <StatTile label="Accuracy" value={`${accuracy}%`} palette={palette} />
          <StatTile label="Birds Identified" value={String(birdsIdentified)} palette={palette} />
          <StatTile label="Seeds" value={String(seeds)} palette={palette} icon={<SeedIcon size={24} color={palette.accent} />} />
          <StatTile label="Best Weekly Finish" value={bestWeeklyPlacement} palette={palette} />
        </div>
      </div>
    </ShareCardFrame>
  );
}