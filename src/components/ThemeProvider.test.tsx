import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { flamingo } from '@/lib/themes';
import ThemeProvider from './ThemeProvider';

vi.mock('@/lib/utils/theme-handler', () => ({
  getTheme: vi.fn(() => flamingo),
}));

describe('ThemeProvider', () => {
  it('renders children and applies the stored theme to the document element', () => {
    render(
      <ThemeProvider>
        <div>Bird Child</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Bird Child')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('Flamingo');
  });
});