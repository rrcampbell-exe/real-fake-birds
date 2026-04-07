export interface StreakCheckpoint {
	value: number;
	reward: number;
	tier: 'minor' | 'major';
}

const streakCheckpoints: StreakCheckpoint[] = [
	{ value: 2, reward: 2, tier: 'minor' },
	{ value: 5, reward: 6, tier: 'minor' },
	{ value: 10, reward: 12, tier: 'major' },
	{ value: 15, reward: 5, tier: 'minor' },
	{ value: 20, reward: 6, tier: 'minor' },
	{ value: 25, reward: 20, tier: 'major' },
	{ value: 30, reward: 7, tier: 'minor' },
	{ value: 35, reward: 8, tier: 'minor' },
	{ value: 40, reward: 9, tier: 'minor' },
	{ value: 45, reward: 10, tier: 'minor' },
	{ value: 50, reward: 30, tier: 'major' },
	{ value: 75, reward: 18, tier: 'minor' },
	{ value: 100, reward: 45, tier: 'major' },
	{ value: 150, reward: 25, tier: 'minor' },
	{ value: 200, reward: 70, tier: 'major' },
	{ value: 300, reward: 100, tier: 'minor' },
	{ value: 400, reward: 130, tier: 'minor' },
	{ value: 500, reward: 175, tier: 'major' },
];

const streakValues = streakCheckpoints.map((checkpoint) => checkpoint.value);
const majorStreakValues = streakCheckpoints
	.filter((checkpoint) => checkpoint.tier === 'major')
	.map((checkpoint) => checkpoint.value);

function getStreakCheckpoint(currentStreak: number): StreakCheckpoint | undefined {
	return streakCheckpoints.find((checkpoint) => checkpoint.value === currentStreak);
}

function getStreakReward(currentStreak: number): number {
	return getStreakCheckpoint(currentStreak)?.reward ?? 0;
}

function isStreakCheckpoint(currentStreak: number): boolean {
	return Boolean(getStreakCheckpoint(currentStreak));
}

function isMajorStreakCheckpoint(currentStreak: number): boolean {
	return getStreakCheckpoint(currentStreak)?.tier === 'major';
}

export {
	getStreakCheckpoint,
	getStreakReward,
	isMajorStreakCheckpoint,
	isStreakCheckpoint,
	majorStreakValues,
	streakCheckpoints,
	streakValues,
};
