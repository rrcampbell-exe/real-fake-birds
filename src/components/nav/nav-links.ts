import { BookOpen, CalendarDays, Settings, Trophy } from 'lucide-react';

export const secondaryNavLinks = [
  { href: '/daily', label: 'Daily Missions', shortLabel: 'Daily', icon: CalendarDays },
  { href: '/leaderboard', label: 'Leaderboard', shortLabel: 'Leaderboard', icon: Trophy },
  { href: '/journal', label: 'Field Journal', shortLabel: 'Journal', icon: BookOpen },
  { href: '/rewards', label: 'Rewards', shortLabel: 'Rewards', icon: Trophy },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
] as const;