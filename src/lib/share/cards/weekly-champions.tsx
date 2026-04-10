import ShareCardFrame from '@/lib/share/card-base';
import type { ShareCardPalette } from '@/lib/share/theme';

interface WeeklyChampionsCardProps {
  username: string;
  gold: number;
  silver: number;
  bronze: number;
  origin: string;
  palette: ShareCardPalette;
}

function MedalColumn({ label, count, color, palette }: { label: string; count: number; color: string; palette: ShareCardPalette }) {
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
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 98,
          height: 98,
          borderRadius: 9999,
          backgroundColor: color,
          color: '#1A1A1A',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          fontWeight: 900,
          textTransform: 'uppercase',
        }}
      >
        {label.slice(0, 1)}
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 24, fontWeight: 800 }}>{label}</div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 64, fontWeight: 900, fontFamily: 'Fredoka' }}>{count}</div>
      <div style={{ display: 'flex', marginTop: 4, fontSize: 18, color: palette.mutedText }}>
        podium finish{count === 1 ? '' : 'es'}
      </div>
    </div>
  );
}

export default function WeeklyChampionsCard({ username, gold, silver, bronze, origin, palette }: WeeklyChampionsCardProps) {
  const total = gold + silver + bronze;

  return (
    <ShareCardFrame
      eyebrow="Weekly Champions"
      title={`${username} has ${total} podium ${total === 1 ? 'finish' : 'finishes'}`}
      subtitle="Top-three weekly results across every challenge, all in one card."
      origin={origin}
      palette={palette}
    >
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 26,
            padding: '22px 28px',
            borderRadius: 28,
            backgroundColor: palette.surfaceMuted,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 18, color: palette.mutedText, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Total Podiums
            </div>
            <div style={{ display: 'flex', marginTop: 10, fontSize: 52, fontWeight: 900, fontFamily: 'Fredoka' }}>{total}</div>
          </div>
          <div style={{ display: 'flex', color: palette.accent, fontSize: 28, fontWeight: 800, fontFamily: 'Fredoka' }}>
            Keep climbing the weekly board
          </div>
        </div>

        <div style={{ display: 'flex', gap: 22, flex: 1 }}>
          <MedalColumn label="Gold" count={gold} color={palette.gold} palette={palette} />
          <MedalColumn label="Silver" count={silver} color={palette.silver} palette={palette} />
          <MedalColumn label="Bronze" count={bronze} color={palette.bronze} palette={palette} />
        </div>
      </div>
    </ShareCardFrame>
  );
}