'use client';

import RouteErrorFallback from '@/components/RouteErrorFallback';

interface ErrorProps {
  reset: () => void;
}

export default function Error({ reset }: ErrorProps) {
  return <RouteErrorFallback reset={reset} />;
}
