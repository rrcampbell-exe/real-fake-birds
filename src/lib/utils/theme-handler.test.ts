import { describe, expect, it } from 'vitest';
import { flamingo, finch } from '@/lib/themes';
import { getTheme, setTheme } from './theme-handler';

describe('theme-handler', () => {
  it('stores the selected theme', () => {
    setTheme(flamingo);
    expect(localStorage.getItem('birdTheme')).toBe(JSON.stringify(flamingo));
  });

  it('returns the stored theme when it is recognized', () => {
    localStorage.setItem('birdTheme', JSON.stringify(flamingo));
    expect(getTheme()).toEqual(flamingo);
  });

  it('falls back to finch when stored data is invalid', () => {
    localStorage.setItem('birdTheme', '{bad json');
    expect(getTheme()).toEqual(finch);
  });

  it('falls back to finch when stored theme name is unknown', () => {
    localStorage.setItem(
      'birdTheme',
      JSON.stringify({ ...flamingo, name: 'NotABird' })
    );
    expect(getTheme()).toEqual(finch);
  });
});