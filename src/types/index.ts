export interface BirdResponse {
  birdName: string;
  isReal: boolean;
  regionLabel?: string;
  sciName?: string;
  url?: string;
  fact?: string;
}

export interface BirdErrorResponse {
  error: string;
}

export type BirdApiResult = BirdResponse | BirdErrorResponse;

export interface BirdJournalMetadata {
  regionLabel?: string;
  sciName?: string;
  fact?: string;
  url?: string;
  classificationRevealed?: boolean;
}

export interface BirdJournalEntry {
  birdKey: string;
  birdName: string;
  isReal: boolean;
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  lastSeenAt: string;
  metadata: BirdJournalMetadata;
}

export type BirdJournalStore = Record<string, BirdJournalEntry>;

export type HintType = 'fact' | 'image';

export interface HintResponse {
  type: HintType;
  content: string;
}

export interface HintErrorResponse {
  error: string;
}

export type HintApiResult = HintResponse | HintErrorResponse;

export interface HintRequest {
  birdName: string;
  isReal: boolean;
  type: HintType;
  regionLabel?: string;
  sciName?: string;
  factHintContent?: string;
}

export interface HintState {
  fact: HintResponse | null;
  image: HintResponse | null;
}

export interface BirdScore {
  birdsSeen: number;
  birdsIdentified: number;
  currentStreak: number;
  justAchievedStreak: boolean;
  bestStreak: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  seeds: number;
}

export type WeeklyChallengeId =
  | 'seed-collector'
  | 'plumage-precision'
  | 'on-fire'
  | 'explorer'
  | 'fake-spotter'
  | 'real-recognizer'
  | 'completionist'
  | 'birdwatcher';

export type WeeklyChallengeIcon =
  | 'bird'
  | 'binoculars'
  | 'collection'
  | 'feather'
  | 'flame'
  | 'masks'
  | 'sprout'
  | 'target';

export type WeeklyChallengeMetric =
  | 'accuracy'
  | 'weeklyBestStreak'
  | 'weeklyBirdsIdentified'
  | 'weeklyBirdsSeen'
  | 'weeklyFakeBirdsIdentified'
  | 'weeklyNewBirdsDiscovered'
  | 'weeklyRealBirdsIdentified'
  | 'weeklySeedsEarned'
  | 'weeklyUniqueBirdsSeen';

export interface WeeklyChallengeDefinition {
  id: WeeklyChallengeId;
  name: string;
  description: string;
  icon: WeeklyChallengeIcon;
  primaryLabel: string;
  tiebreakerLabel: string;
  qualificationText?: string;
  metric: WeeklyChallengeMetric;
  tiebreakerMetric: WeeklyChallengeMetric;
  minimumBirdsSeen?: number;
}

export interface WeeklyPlacementSummary {
  bestWeeklyPlacement: number | null;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
}

export interface WeeklyRecap {
  weekStart: string;
  participated: boolean;
  qualified: boolean;
  rank: number | null;
  rewardSeeds: number;
}

export interface WeeklyLeaderboardEntry {
  rank: number;
  username: string;
  avatarPalette: string | null;
  primaryValue: number;
  primaryDisplayValue: string;
  tiebreakerValue: number;
  tiebreakerDisplayValue: string;
  birdsSeen: number;
  isCurrentUser: boolean;
}

export interface WeeklyOverview {
  currentWeekStart: string;
  challenge: WeeklyChallengeDefinition;
  previousRecap: WeeklyRecap | null;
  placementSummary: WeeklyPlacementSummary;
}

export type GameMode = 'classic' | 'daily';

export interface GameRoundResult {
  isCorrect: boolean;
  isReal: boolean;
  chosenResponse: 'real' | 'fake';
  seedsEarned: number;
  currentStreak: number;
  bestStreak: number;
  birdsSeen: number;
  birdsIdentified: number;
  usedHintTypes: HintType[];
  streakProtected: boolean;
  earnedBadgeName: string | null;
  unlockedThemeName: string | null;
}

export interface DailyChallengeState {
  date: string;
  roundsPlayed: number;
  correctAnswers: number;
  completed: boolean;
  completionBonusAwarded: boolean;
  perfectBonusAwarded: boolean;
  bonusSeedsAwarded: number;
  roundResults: boolean[];
}

export interface DailyChallengeHistoryEntry {
  date: string;
  correctAnswers: number;
  roundsPlayed: number;
  completed: boolean;
}

export interface DailyMissionHistoryEntry {
  date: string;
}

export type MissionType =
  | 'play_rounds'
  | 'correct_answers'
  | 'correct_without_hints'
  | 'use_hints'
  | 'earn_seeds'
  | 'identify_real_birds'
  | 'identify_fake_birds';

export interface MissionDefinition {
  id: string;
  description: string;
  type: MissionType;
  target: number;
  rewardSeeds: number;
}

export interface MissionProgressState {
  missionId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface SessionMissionsState {
  date: string;
  missions: MissionProgressState[];
  bonusClaimed: boolean;
}

export interface StreakInsuranceState {
  active: boolean;
  protectedMissesRemaining: number;
  cost: number;
  purchasedAtStreak: number;
}

export interface SharePayload {
  title: string;
  text: string;
}

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  textColor: string;
  realFakeTextColor: string;
  themeSong?: string;
}

export interface Milestone {
  badge: string;
  value: number;
  description: string;
  achievement: string;
}

export interface Location {
  alpha2code: string;
  demonym: string;
  name: string;
  subregion: string;
}

export interface SoundSettings {
  sfxMuted: boolean;
  sfxVolume: number;
  musicMuted: boolean;
  musicVolume: number;
}

export interface SvgIconProps {
  color: string;
  size: string;
}
