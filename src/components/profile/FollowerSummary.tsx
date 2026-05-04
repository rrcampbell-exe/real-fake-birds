'use client';

import { Users } from 'lucide-react';

/**
 * Follower/following count display — Sprint 1 visual placeholder only.
 * Real data fetching and follow actions are deferred to Sprint 2.
 */
export default function FollowerSummary() {
  return (
    <section>
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Users size={14} aria-hidden="true" />
        <span>0 followers · 0 following</span>
      </div>
    </section>
  );
}
