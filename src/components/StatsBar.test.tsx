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
      })
    );

    render(<StatsBar refreshTrigger={0} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('1 to next streak')).toBeInTheDocument();
  });

  it('refreshes when the trigger changes', () => {
    localStorage.setItem(
      'birdScore',
      JSON.stringify({
        birdsSeen: 4,
        birdsIdentified: 2,
        currentStreak: 1,
        bestStreak: 3,
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
      })
    );

    view.rerender(<StatsBar refreshTrigger={1} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getAllByText('5')[0]).toBeInTheDocument();
  });
});