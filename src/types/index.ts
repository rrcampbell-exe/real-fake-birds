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
  seeds: number;
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
