export interface BirdResponse {
  birdName: string;
  isReal: boolean;
  url?: string;
}

export interface BirdErrorResponse {
  error: string;
}

export type BirdApiResult = BirdResponse | BirdErrorResponse;

export interface BirdScore {
  birdsSeen: number;
  birdsIdentified: number;
  currentStreak: number;
  justAchievedStreak: boolean;
  bestStreak: number;
}

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  textColor: string;
  realFakeTextColor: string;
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
  muted: boolean;
  volume: number;
}

export interface SvgIconProps {
  color: string;
  size: string;
}
