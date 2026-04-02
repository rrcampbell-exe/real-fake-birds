export interface BirdResponse {
  birdName: string;
  isReal: boolean;
  regionLabel?: string;
  sciName?: string;
  url?: string;
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
