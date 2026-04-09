import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JournalControls from './JournalControls';

describe('JournalControls', () => {
  it('renders filter buttons and fires filter changes', () => {
    const onFilterChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <JournalControls
        filter="all"
        sort="recent"
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Real Only' }));

    expect(onFilterChange).toHaveBeenCalledWith('real');
  });

  it('fires sort changes from the select menu', () => {
    const onFilterChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <JournalControls
        filter="fake"
        sort="recent"
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'accuracy' } });

    expect(onSortChange).toHaveBeenCalledWith('accuracy');
  });
});
