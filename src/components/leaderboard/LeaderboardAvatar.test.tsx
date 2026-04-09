import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaderboardAvatar from './LeaderboardAvatar';

vi.mock('@/lib/utils/theme-handler', () => ({
  findThemeByName: vi.fn(),
}));

import { findThemeByName } from '@/lib/utils/theme-handler';

describe('LeaderboardAvatar', () => {
  beforeEach(() => {
    vi.mocked(findThemeByName).mockReset();
  });

  it('renders the themed bird avatar when a theme is found', () => {
    vi.mocked(findThemeByName).mockReturnValue({
      name: 'Finch',
      primary: '#112233',
      secondary: '#ddeeff',
      textColor: '#000000',
      themeSong: '/sounds/themes/finch.mp3',
    });

    const { container } = render(<LeaderboardAvatar username="birder" avatarPalette="Finch" />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByText('B')).toBeNull();
  });

  it('falls back to the user initial when no theme can be found', () => {
    vi.mocked(findThemeByName).mockReturnValue(undefined);

    render(<LeaderboardAvatar username="birder" avatarPalette={null} />);

    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
