/**
 * Generates the iOS native splash screen image.
 *
 * Output: ios/App/App/Assets.xcassets/Splash.imageset/splash.png
 *
 * The splash is a simple publisher card: white background, Catbird Games logo
 * centered. iOS shows this for ~1s during cold launch before React hydrates
 * and the boot screen takes over.
 *
 * Usage:
 *   npx tsx scripts/generate-splash.ts
 *   npm run generate:splash
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const SIZE = 2732;

// Logo display width on the canvas (~29% of canvas width for a comfortably
// centred appearance on all screen sizes)
const LOGO_W = 800;
// Source is 1280×720; preserve aspect ratio
const LOGO_H = Math.round(LOGO_W * (720 / 1280));

const LOGO_X = Math.round((SIZE - LOGO_W) / 2);
const LOGO_Y = Math.round((SIZE - LOGO_H) / 2);

const LOGO_SRC = resolve('public/images/branding/catbird_games_logo_v3.png');
const OUTPUT_PATH = resolve('ios/App/App/Assets.xcassets/Splash.imageset/splash.png');

async function generateSplash(): Promise<void> {
  console.log('Reading Catbird Games logo...');
  const logoBuffer = readFileSync(LOGO_SRC);

  const logoResized = await sharp(logoBuffer)
    .resize(LOGO_W, LOGO_H, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  console.log('Compositing splash canvas...');
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: logoResized, top: LOGO_Y, left: LOGO_X }])
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT_PATH);

  console.log(`✓ Splash written to ${OUTPUT_PATH}`);
  console.log(`  Canvas: ${SIZE}×${SIZE}px (white background)`);
  console.log(`  Logo:   ${LOGO_W}×${LOGO_H}px centred at (${LOGO_X}, ${LOGO_Y})`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run `cap sync` to copy the updated asset to Xcode.');
  console.log('  2. Clean the build in Xcode (Product → Clean Build Folder) before running.');
}

generateSplash().catch(err => {
  console.error('Failed to generate splash:', err);
  process.exit(1);
});

