import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MilestoneBadgeSvg from './MilestoneBadgeSvg';

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

describe('MilestoneBadgeSvg', () => {
  it('renders the badge asset that matches the milestone tier', () => {
    render(<MilestoneBadgeSvg color="#fff" milestoneValue={2500} />);

    const badgeImage = screen.getByAltText('Transplanar Feather badge');
    expect(badgeImage).toHaveAttribute('src', '/images/badges/transplanar_feather.png');
  });

  it('renders nothing for unknown milestone values', () => {
    const { container } = render(<MilestoneBadgeSvg color="#fff" milestoneValue={9999} />);

    expect(container).toBeEmptyDOMElement();
  });
});