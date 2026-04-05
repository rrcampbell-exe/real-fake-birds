import { Filter } from 'bad-words';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'app',
  'bird',
  'birds',
  'daily',
  'me',
  'menu',
  'mod',
  'moderator',
  'null',
  'owner',
  'play',
  'realfakebirds',
  'realfakebirdsapp',
  'rewards',
  'root',
  'settings',
  'support',
  'system',
]);

const leetspeakMap: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

const profanityFilter = new Filter();

export type UsernameValidationIssue =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_characters'
  | 'reserved'
  | 'profane';

export interface UsernameValidationResult {
  isValid: boolean;
  issues: UsernameValidationIssue[];
  normalizedUsername: string;
}

function normalizeUsernameBase(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeUsernameCanonical(value: string): string {
  return normalizeUsernameBase(value).replace(/[^a-z0-9_]/g, '');
}

export function normalizeUsernameForModeration(value: string): string {
  return normalizeUsernameBase(value)
    .split('')
    .map((character) => leetspeakMap[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

export function validateUsername(value: string): UsernameValidationResult {
  const trimmed = value.trim();
  const normalizedUsername = normalizeUsernameCanonical(trimmed);
  const moderationNormalizedUsername = normalizeUsernameForModeration(trimmed);
  const issues = new Set<UsernameValidationIssue>();

  if (trimmed.length === 0) {
    issues.add('empty');
  }

  if (trimmed.length > 0 && trimmed.length < USERNAME_MIN_LENGTH) {
    issues.add('too_short');
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    issues.add('too_long');
  }

  if (trimmed.length > 0 && !USERNAME_PATTERN.test(trimmed)) {
    issues.add('invalid_characters');
  }

  if (moderationNormalizedUsername && RESERVED_USERNAMES.has(moderationNormalizedUsername)) {
    issues.add('reserved');
  }

  if (
    moderationNormalizedUsername &&
    (
      profanityFilter.isProfane(trimmed.toLowerCase())
      || profanityFilter.isProfane(moderationNormalizedUsername)
      || profanityFilter.list.some(
        (word) => word.length > 2 && moderationNormalizedUsername.includes(word.toLowerCase())
      )
    )
  ) {
    issues.add('profane');
  }

  return {
    isValid: issues.size === 0,
    issues: Array.from(issues),
    normalizedUsername,
  };
}