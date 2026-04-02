import { readBirdScore, writeBirdScore } from './player-progress';

export function spendSeeds(cost: number): boolean {
  if (cost <= 0) {
    return true;
  }

  const birdScore = readBirdScore();
  if (birdScore.seeds < cost) {
    return false;
  }

  writeBirdScore({
    ...birdScore,
    seeds: birdScore.seeds - cost,
  });

  return true;
}

export function refundSeeds(cost: number): void {
  if (cost <= 0) {
    return;
  }

  const birdScore = readBirdScore();
  writeBirdScore({
    ...birdScore,
    seeds: birdScore.seeds + cost,
  });
}