import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FollowerSummary from './FollowerSummary';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('FollowerSummary', () => {
  it('renders loading skeleton when counts are not provided', () => {
    render(<FollowerSummary />);
    expect(screen.getByLabelText('Loading follower counts')).toBeInTheDocument();
    expect(screen.queryByText('0 followers')).not.toBeInTheDocument();
  });

  it('renders counts when both are provided', () => {
    render(<FollowerSummary followerCount={5} followingCount={3} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('followers')).toBeInTheDocument();
    expect(screen.getByText('following')).toBeInTheDocument();
  });

  it('calls onFollowersClick when follower count button is clicked', async () => {
    const user = userEvent.setup();
    const onFollowersClick = vi.fn();
    render(
      <FollowerSummary
        followerCount={7}
        followingCount={2}
        onFollowersClick={onFollowersClick}
      />
    );
    await user.click(screen.getByText('7'));
    expect(onFollowersClick).toHaveBeenCalledOnce();
  });

  it('calls onFollowingClick when following count button is clicked', async () => {
    const user = userEvent.setup();
    const onFollowingClick = vi.fn();
    render(
      <FollowerSummary
        followerCount={7}
        followingCount={2}
        onFollowingClick={onFollowingClick}
      />
    );
    await user.click(screen.getByText('2'));
    expect(onFollowingClick).toHaveBeenCalledOnce();
  });

  it('renders static pills when no actions are provided', () => {
    render(<FollowerSummary followerCount={7} followingCount={2} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByLabelText('7 followers')).toBeInTheDocument();
    expect(screen.getByLabelText('2 following')).toBeInTheDocument();
  });

  it('renders links when hrefs are provided', () => {
    render(
      <FollowerSummary
        followerCount={7}
        followingCount={2}
        followersHref="/community?tab=followers"
        followingHref="/community?tab=following"
      />
    );

    expect(screen.getByRole('link', { name: /7 followers/i })).toHaveAttribute('href', '/community?tab=followers');
    expect(screen.getByRole('link', { name: /2 following/i })).toHaveAttribute('href', '/community?tab=following');
  });

  it('renders loading skeleton when followingCount is not provided', () => {
    render(<FollowerSummary followerCount={5} />);
    expect(screen.getByLabelText('Loading follower counts')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
});
