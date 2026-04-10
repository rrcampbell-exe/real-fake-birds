import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';

type ShareCardFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
};

const loadShareFonts = cache(async () => {
  const cwd = process.cwd();

  const [displayFont, bodyFontRegular, bodyFontBold] = await Promise.all([
    readFile(join(cwd, 'node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff')),
    readFile(join(cwd, 'node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff')),
    readFile(join(cwd, 'node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff')),
  ]);

  const fonts: ShareCardFont[] = [
    {
      name: 'Fredoka',
      data: displayFont,
      weight: 700,
      style: 'normal',
    },
    {
      name: 'DM Sans',
      data: bodyFontRegular,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'DM Sans',
      data: bodyFontBold,
      weight: 700,
      style: 'normal',
    },
  ];

  return fonts;
});

export async function getShareCardFonts() {
  return loadShareFonts();
}