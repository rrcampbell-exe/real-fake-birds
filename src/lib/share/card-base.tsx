import type { ReactNode } from 'react';
import { SHARE_CARD_HEIGHT, SHARE_CARD_PADDING, SHARE_CARD_WIDTH } from '@/lib/constants/share-card';
import type { ShareCardPalette } from '@/lib/share/theme';

interface ShareCardFrameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  origin: string;
  palette: ShareCardPalette;
  children: ReactNode;
}

function getOriginLabel(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./, '');
  } catch {
    return origin;
  }
}

export default function ShareCardFrame({ eyebrow, title, subtitle, origin, palette, children }: ShareCardFrameProps) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        padding: SHARE_CARD_PADDING,
        backgroundColor: palette.background,
        color: palette.text,
        fontFamily: 'DM Sans',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -140,
          right: -60,
          width: 360,
          height: 360,
          borderRadius: 9999,
          backgroundColor: palette.backgroundAccent,
          opacity: 0.95,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -120,
          left: -40,
          width: 280,
          height: 280,
          borderRadius: 9999,
          border: `2px solid ${palette.border}`,
          backgroundColor: palette.backgroundOrb,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                marginBottom: 12,
                color: palette.accent,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </div>
            <div style={{ display: 'flex', fontSize: 54, fontWeight: 800, lineHeight: 1.05, maxWidth: 660, fontFamily: 'Fredoka' }}>{title}</div>
            <div style={{ display: 'flex', marginTop: 16, fontSize: 22, lineHeight: 1.35, color: palette.mutedText, maxWidth: 700 }}>
              {subtitle}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 162,
              padding: '12px 18px',
              borderRadius: 9999,
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1.8,
              fontFamily: 'Fredoka',
            }}
          >
            REAL FAKE BIRDS
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, marginTop: 32 }}>{children}</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
            paddingTop: 20,
            borderTop: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ display: 'flex', color: palette.mutedText, fontSize: 20 }}>
            Some are real. Some are fake. Tell them apart.
          </div>
          <div style={{ display: 'flex', color: palette.accent, fontSize: 20, fontWeight: 700 }}>
            {getOriginLabel(origin)}
          </div>
        </div>
      </div>
    </div>
  );
}