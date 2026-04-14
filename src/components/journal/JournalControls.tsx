'use client';

import { Birdhouse, ChevronDown, Search, X } from 'lucide-react';

export type JournalFilter = 'all' | 'real' | 'fake' | 'birdhouse';
export type JournalSort = 'recent' | 'name' | 'seen' | 'accuracy';

interface JournalControlsProps {
  filter: JournalFilter;
  searchQuery: string;
  sort: JournalSort;
  onFilterChange: (filter: JournalFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: JournalSort) => void;
}

const filters: Array<{ value: JournalFilter; label: string }> = [
  { value: 'all', label: 'All Birds' },
  { value: 'real', label: 'Real Only' },
  { value: 'fake', label: 'Fake Only' },
  { value: 'birdhouse', label: 'Birdhouse' },
];

const sorts: Array<{ value: JournalSort; label: string }> = [
  { value: 'recent', label: 'Recently Seen' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'seen', label: 'Most Seen' },
  { value: 'accuracy', label: 'Best Accuracy' },
];

export default function JournalControls({ filter, searchQuery, sort, onFilterChange, onSearchChange, onSortChange }: JournalControlsProps) {
  return (
    <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-muted)]">
          Search
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search birds, places, notes..."
              className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-10 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-muted)] hover:bg-[var(--color-surface)] focus:border-[var(--color-secondary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-border)] hover:text-[var(--color-text)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </label>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Filter
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map((option) => {
              const active = option.value === filter;
              const showBirdhouseIcon = option.value === 'birdhouse';
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFilterChange(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                      : 'border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  {showBirdhouseIcon ? <Birdhouse size={15} fill={active ? 'currentColor' : 'none'} /> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-muted)]">
            Sort By
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as JournalSort)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-2 pr-10 text-sm text-[var(--color-text)] outline-none transition hover:bg-[var(--color-surface)] focus:border-[var(--color-secondary)]"
              >
                {sorts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              />
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}
