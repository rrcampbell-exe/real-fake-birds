import { Birdhouse, BookOpen, CalendarDays, CircleUser, Settings, UserStar } from 'lucide-react';

export const secondaryNavLinks = [
  { href: '/daily', label: 'Daily Missions', shortLabel: 'Daily', icon: CalendarDays },
  { href: '/leaderboard', label: 'Leaderboard', shortLabel: 'Leaderboard', icon: UserStar },
  { href: '/journal', label: 'Field Journal', shortLabel: 'Journal', icon: BookOpen },
  { href: '/birdhouse', label: 'My Birdhouse', shortLabel: 'Birdhouse', icon: Birdhouse },
  { href: '/profile', label: 'Profile', shortLabel: 'Profile', icon: CircleUser },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
] as const;