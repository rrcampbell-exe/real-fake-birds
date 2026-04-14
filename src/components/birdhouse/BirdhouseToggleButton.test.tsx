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

vi.mock('@/lib/auth/account-session', () => ({
  pushBirdhouseToAccount: vi.fn().mockResolvedValue(undefined),
}));

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import BirdhouseToggleButton from './BirdhouseToggleButton';

function makeMocks({
  inBirdhouse = false,
  isSignedIn = false,
  prefersReducedMotion = false,
  addResult = { real: [], fake: [], updatedAt: '' },
} = {}) {
  vi.mocked(usePrefersReducedMotion).mockReturnValue(prefersReducedMotion);
  vi.mocked(useAccountState).mockReturnValue({ isSignedIn } as ReturnType<typeof useAccountState>);
  vi.mocked(useBirdhouse).mockReturnValue({
    birdhouse: { real: [], fake: [], updatedAt: '' },
    realCount: 0,
    fakeCount: 0,
    realCap: 10,
    fakeCap: 10,
    isInBirdhouse: vi.fn().mockReturnValue(inBirdhouse),
    add: vi.fn().mockReturnValue(addResult),
    remove: vi.fn(),
    swap: vi.fn(),
  });
}

describe('BirdhouseToggleButton', () => {
  beforeEach(() => {
    makeMocks();
  });

  it('renders Add to Birdhouse button when bird is not in birdhouse', () => {
    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );
    expect(screen.getByRole('button', { name: /add blue jay to birdhouse/i })).toBeInTheDocument();
  });

  it('renders Remove from Birdhouse button when bird is in birdhouse', () => {
    makeMocks({ inBirdhouse: true });
    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );
    expect(screen.getByRole('button', { name: /remove blue jay from birdhouse/i })).toBeInTheDocument();
  });

  it('calls remove and play release when bird is in birdhouse', () => {
    makeMocks({ inBirdhouse: true });
    const { remove } = vi.mocked(useBirdhouse)();

    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(remove).toHaveBeenCalledWith('real:jay', true);
  });

  it('calls pushBirdhouseToAccount on remove when signed in', async () => {
    const { pushBirdhouseToAccount } = await import('@/lib/auth/account-session');
    makeMocks({ inBirdhouse: true, isSignedIn: true });

    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(pushBirdhouseToAccount).toHaveBeenCalled();
  });

  it('does not call pushBirdhouseToAccount on remove when not signed in', async () => {
    const { pushBirdhouseToAccount } = await import('@/lib/auth/account-session');
    vi.mocked(pushBirdhouseToAccount).mockClear();
    makeMocks({ inBirdhouse: true, isSignedIn: false });

    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(pushBirdhouseToAccount).not.toHaveBeenCalled();
  });

  it('calls add when bird is not in birdhouse and store has capacity', () => {
    const { add } = vi.mocked(useBirdhouse)();

    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(add).toHaveBeenCalledWith('real:jay', true);
  });

  it('calls pushBirdhouseToAccount on add when signed in and store has capacity', async () => {
    const { pushBirdhouseToAccount } = await import('@/lib/auth/account-session');
    makeMocks({ isSignedIn: true });

    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(pushBirdhouseToAccount).toHaveBeenCalled();
  });

  it('calls onRequestSwap when add returns null (birdhouse full)', () => {
    const onRequestSwap = vi.fn();
    makeMocks({ addResult: null as unknown as { real: string[]; fake: string[]; updatedAt: string } });
    vi.mocked(useBirdhouse).mockReturnValue({
      ...vi.mocked(useBirdhouse)(),
      add: vi.fn().mockReturnValue(null),
    });

    render(
      <BirdhouseToggleButton
        birdKey="real:jay"
        birdName="Blue Jay"
        isReal={true}
        onRequestSwap={onRequestSwap}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onRequestSwap).toHaveBeenCalledWith({ birdKey: 'real:jay', birdName: 'Blue Jay', isReal: true });
  });

  it('does not throw when onRequestSwap is not provided and birdhouse is full', () => {
    vi.mocked(useBirdhouse).mockReturnValue({
      ...vi.mocked(useBirdhouse)(),
      add: vi.fn().mockReturnValue(null),
    });

    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );

    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });

  it('shows label text when showLabel is true', () => {
    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} showLabel={true} />
    );
    expect(screen.getByText('+ Birdhouse')).toBeInTheDocument();
  });

  it('shows in-birdhouse label text when showLabel is true and bird is in birdhouse', () => {
    makeMocks({ inBirdhouse: true });
    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} showLabel={true} />
    );
    expect(screen.getByText('✓ Birdhouse')).toBeInTheDocument();
  });

  it('applies sm size class when size is sm', () => {
    const { container } = render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} size="sm" />
    );
    expect(container.querySelector('button')?.className).toContain('px-3 py-1.5');
  });

  it('applies md size class when size is md', () => {
    const { container } = render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} size="md" />
    );
    expect(container.querySelector('button')?.className).toContain('min-h-10');
  });

  it('renders without crashing with prefersReducedMotion=true', () => {
    makeMocks({ prefersReducedMotion: true });
    render(
      <BirdhouseToggleButton birdKey="real:jay" birdName="Blue Jay" isReal={true} />
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
