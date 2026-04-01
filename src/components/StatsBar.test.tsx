import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatsBar from './StatsBar';

describe('StatsBar', () => {
  it('renders nothing when no bird score exists', () => {
    const { container } = render(<StatsBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders stats from localStorage', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 10,
        birdsIdentified: 7,
        currentStreak: 4,
        bestStreak: 9,
        seeds: 12,
      })
    );

    render(<StatsBar refreshTrigger={0} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 to unlock Downy Feather Badge and Raven Theme')).toBeInTheDocument();
  });

  it('refreshes when the trigger changes', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 4,
        birdsIdentified: 2,
        currentStreak: 1,
        bestStreak: 3,
        seeds: 1,
      })
    );

    const view = render(<StatsBar refreshTrigger={0} />);
    expect(screen.getByText('50%')).toBeInTheDocument();

    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 5,
        birdsIdentified: 5,
        currentStreak: 5,
        bestStreak: 5,
        seeds: 9,
      })
    );

    view.rerender(<StatsBar refreshTrigger={1} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getAllByText('5')[0]).toBeInTheDocument();
  });

  it('does not mention a theme when that theme is already unlocked', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 40,
        birdsIdentified: 11,
        currentStreak: 2,
        bestStreak: 6,
        seeds: 0,
      })
    );
    localStorage.setItem('unlockedThemes', JSON.stringify(['Robin']));

    render(<StatsBar refreshTrigger={0} />);

    expect(screen.getByText('14 to unlock Contour Feather Badge')).toBeInTheDocument();
    expect(screen.queryByText(/Robin Theme/i)).not.toBeInTheDocument();
  });
});