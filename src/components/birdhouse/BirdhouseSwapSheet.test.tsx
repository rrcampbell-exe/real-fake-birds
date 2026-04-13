import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: vi.fn(),
}));

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

vi.mock('@/hooks/useBirdhouse', () => ({
  useBirdhouse: vi.fn(),
}));

vi.mock('@/hooks/useBirdJournal', () => ({
  useBirdJournal: vi.fn(),
}));

vi.mock('@/lib/auth/account-session', () => ({
  pushBirdhouseToAccount: vi.fn().mockResolvedValue(undefined),
}));

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import BirdhouseSwapSheet from './BirdhouseSwapSheet';

const incomingRealBird = { birdKey: 'real:heron', birdName: 'Great Blue Heron', isReal: true };
const incomingFakeBird = { birdKey: 'fake:phoenix', birdName: 'Phoenix', isReal: false };

function makeSwapSheetMocks({
  isSignedIn = false,
  prefersReducedMotion = false,
  birdhouseReal = ['real:jay'],
  birdhouseFake = ['fake:sparrow'],
  journalByKey = {
    'real:jay': { birdKey: 'real:jay', birdName: 'Blue Jay', isReal: true, seenCount: 1, correctCount: 1 },
    'fake:sparrow': { birdKey: 'fake:sparrow', birdName: 'Fake Sparrow', isReal: false, seenCount: 1, correctCount: 1 },
  },
} = {}) {
  vi.mocked(usePrefersReducedMotion).mockReturnValue(prefersReducedMotion);
  vi.mocked(useAccountState).mockReturnValue({ isSignedIn } as ReturnType<typeof useAccountState>);
  vi.mocked(useBirdhouse).mockReturnValue({
    birdhouse: { real: birdhouseReal, fake: birdhouseFake, updatedAt: '2026-01-01T00:00:00.000Z' },
    realCount: birdhouseReal.length,
    fakeCount: birdhouseFake.length,
    realCap: 10,
    fakeCap: 10,
    isInBirdhouse: vi.fn().mockReturnValue(false),
    add: vi.fn(),
    remove: vi.fn(),
    swap: vi.fn(),
  });
  vi.mocked(useBirdJournal).mockReturnValue({
    journal: [],
    journalByKey,
    getEntry: vi.fn(),
    uniqueBirdCount: 0,
    realBirdCount: 0,
    fakeBirdCount: 0,
    totalSeen: 0,
    totalCorrect: 0,
    accuracy: 0,
  });
}

describe('BirdhouseSwapSheet', () => {
  beforeEach(() => {
    makeSwapSheetMocks();
  });

  it('renders nothing when incomingBird is null', () => {
    const { container } = render(
      <BirdhouseSwapSheet incomingBird={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when isOpen is false', () => {
    const { queryByRole } = render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={false} onClose={vi.fn()} />
    );
    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with real birdhouse title when isOpen is true and bird is real', () => {
    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Real Birdhouse Full')).toBeInTheDocument();
  });

  it('renders fake birdhouse title when incoming bird is fake', () => {
    makeSwapSheetMocks({ birdhouseFake: ['fake:sparrow'] });
    render(
      <BirdhouseSwapSheet incomingBird={incomingFakeBird} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('Fake Birdhouse Full')).toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={onClose} />
    );
    fireEvent.click(screen.getByLabelText('Dismiss birdhouse swap'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={onClose} />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders bird entries from the current collection', () => {
    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('Blue Jay')).toBeInTheDocument();
  });

  it('skips rendering a bird entry when journal entry is missing', () => {
    makeSwapSheetMocks({ birdhouseReal: ['real:jay', 'real:unknown'], journalByKey: {
      'real:jay': { birdKey: 'real:jay', birdName: 'Blue Jay', isReal: true, seenCount: 1, correctCount: 1 },
    } });
    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('Blue Jay')).toBeInTheDocument();
  });

  it('calls swap and pushBirdhouseToAccount when signed in and a bird is selected for swap', async () => {
    const { pushBirdhouseToAccount } = await import('@/lib/auth/account-session');
    const swap = vi.fn();
    const onClose = vi.fn();
    makeSwapSheetMocks({ isSignedIn: true });
    vi.mocked(useBirdhouse).mockReturnValue({
      ...vi.mocked(useBirdhouse)(),
      swap,
    });

    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('Blue Jay'));
    expect(swap).toHaveBeenCalledWith('real:heron', 'real:jay', true);
    expect(pushBirdhouseToAccount).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls swap without pushBirdhouseToAccount when not signed in', async () => {
    const { pushBirdhouseToAccount } = await import('@/lib/auth/account-session');
    const swap = vi.fn();
    const onClose = vi.fn();
    makeSwapSheetMocks({ isSignedIn: false });
    vi.mocked(useBirdhouse).mockReturnValue({
      ...vi.mocked(useBirdhouse)(),
      swap,
    });

    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('Blue Jay'));
    expect(swap).toHaveBeenCalled();
    expect(pushBirdhouseToAccount).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders with prefersReducedMotion=true without crashing', () => {
    makeSwapSheetMocks({ prefersReducedMotion: true });
    render(
      <BirdhouseSwapSheet incomingBird={incomingRealBird} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
