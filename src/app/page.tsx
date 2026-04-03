import GameSection from '@/components/GameSection';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <GameSection />
    </ErrorBoundary>
  );
}
