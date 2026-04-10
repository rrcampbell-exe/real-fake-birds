import MilestoneBadgeSvg from '@/components/icons/MilestoneBadgeSvg';
import ShareCardFrame from '@/lib/share/card-base';
import type { ShareCardPalette } from '@/lib/share/theme';

interface MilestoneBadgeCardProps {
  badgeName: string;
  birdsIdentified: number;
  milestoneValue: number;
  description: string;
  origin: string;
  palette: ShareCardPalette;
}

export default function MilestoneBadgeCard({
  badgeName,
  birdsIdentified,
  milestoneValue,
  description,
  origin,
  palette,
}: MilestoneBadgeCardProps) {
  return (
    <ShareCardFrame
      eyebrow="Milestone Badge"
      title={badgeName}
      subtitle={`Unlocked after identifying ${birdsIdentified} birds. ${description}`}
      origin={origin}
      palette={palette}
    >
      <div style={{ display: 'flex', flex: 1, gap: 28 }}>
        <div
          style={{
            display: 'flex',
            width: 330,
            borderRadius: 36,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MilestoneBadgeSvg milestoneValue={milestoneValue} color={palette.text} />
        </div>

        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              borderRadius: 28,
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
            }}
          >
            <div style={{ display: 'flex', color: palette.accent, fontSize: 18, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase' }}>
              Feather Earned
            </div>
            <div style={{ display: 'flex', marginTop: 18, fontSize: 54, fontWeight: 900, fontFamily: 'Fredoka' }}>
              {milestoneValue}
            </div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 22, color: palette.mutedText }}>
              birds identified to reach this trophy shelf tier
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              borderRadius: 28,
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
          >
            <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase' }}>
              Why it matters
            </div>
            <div style={{ display: 'flex', marginTop: 14, fontSize: 24, lineHeight: 1.4, fontWeight: 700 }}>
              {description}
            </div>
          </div>
        </div>
      </div>
    </ShareCardFrame>
  );
}