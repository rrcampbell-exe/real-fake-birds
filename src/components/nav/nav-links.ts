import { Birdhouse, BookOpen, CalendarDays, Settings, Trophy, UserStar } from 'lucide-react';

export const secondaryNavLinks = [
  { href: '/daily', label: 'Daily Missions', shortLabel: 'Daily', icon: CalendarDays },
  { href: '/leaderboard', label: 'Leaderboard', shortLabel: 'Leaderboard', icon: UserStar },
  { href: '/journal', label: 'Field Journal', shortLabel: 'Journal', icon: BookOpen },
  { href: '/birdhouse', label: 'My Birdhouse', shortLabel: 'Birdhouse', icon: Birdhouse },
  { href: '/rewards', label: 'Rewards', shortLabel: 'Rewards', icon: Trophy },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
] as const;