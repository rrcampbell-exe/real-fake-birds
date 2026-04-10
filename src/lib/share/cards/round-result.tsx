import ShareCardFrame from '@/lib/share/card-base';
import type { ShareCardPalette } from '@/lib/share/theme';

interface RoundResultCardProps {
  birdName: string;
  scientificName: string;
  isReal: boolean;
  isCorrect: boolean;
  imageSrc: string | null;
  streak: number;
  fieldNote: string;
  origin: string;
  palette: ShareCardPalette;
}

function ResultPill({ label, tone, palette }: { label: string; tone: 'success' | 'error' | 'accent'; palette: ShareCardPalette }) {
  const backgroundColor = tone === 'success'
    ? palette.surfaceMuted
    : tone === 'error'
      ? palette.surfaceMuted
      : palette.surfaceMuted;
  const color = tone === 'success'
    ? palette.success
    : tone === 'error'
      ? palette.error
      : palette.streak;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 18px',
        borderRadius: 9999,
        backgroundColor,
        color,
        fontSize: 20,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
      }}
    >
      {label}
    </div>
  );
}

export default function RoundResultCard({
  birdName,
  scientificName,
  isReal,
  isCorrect,
  imageSrc,
  streak,
  fieldNote,
  origin,
  palette,
}: RoundResultCardProps) {
  const subtitle = isCorrect
    ? `Correct call. ${isReal ? 'That bird is real.' : 'That bird was a fake.'}`
    : `Missed it. ${isReal ? 'That bird was real.' : 'That bird was fake.'}`;

  return (
    <ShareCardFrame
      eyebrow="Round Result"
      title={birdName}
      subtitle={subtitle}
      origin={origin}
      palette={palette}
    >
      <div style={{ display: 'flex', flex: 1, gap: 28 }}>
        <div
          style={{
            display: 'flex',
            width: 360,
            borderRadius: 32,
            overflow: 'hidden',
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={birdName}
              width="360"
              height="280"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: palette.accent, fontFamily: 'Fredoka' }}>???</div>
              <div style={{ display: 'flex', marginTop: 12, fontSize: 22, color: palette.mutedText }}>
                No photo. All mystery.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
            <ResultPill label={isCorrect ? 'Correct' : 'Incorrect'} tone={isCorrect ? 'success' : 'error'} palette={palette} />
            <ResultPill label={isReal ? 'Real Bird' : 'Fake Bird'} tone={isReal ? 'success' : 'error'} palette={palette} />
            {streak > 1 ? <ResultPill label={`${streak} Streak`} tone="accent" palette={palette} /> : null}
          </div>

          <div style={{ display: 'flex', fontSize: 24, color: palette.mutedText, fontStyle: 'italic' }}>
            {scientificName || (isReal ? 'Scientific name unavailable' : 'Fabricated species profile')}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 24,
              padding: 24,
              borderRadius: 28,
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                color: palette.accent,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {isReal ? 'Field Notes' : 'Fake Field Notes'}
            </div>
            <div style={{ display: 'flex', marginTop: 14, fontSize: 24, lineHeight: 1.45, color: palette.text }}>
              {fieldNote}
            </div>
          </div>
        </div>
      </div>
    </ShareCardFrame>
  );
}