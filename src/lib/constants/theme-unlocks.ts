export interface ThemeUnlock {
  themeName: string;
  milestoneBadge: string;
  milestoneValue: number;
  seedCost: number;
  comingSoon: boolean;
}

export const themeUnlocks: ThemeUnlock[] = [
  {
    themeName: 'Raven',
    milestoneBadge: 'Downy Feather',
    milestoneValue: 10,
    seedCost: 10,
    comingSoon: false,
  },
  {
    themeName: 'Robin',
    milestoneBadge: 'Contour Feather',
    milestoneValue: 25,
    seedCost: 25,
    comingSoon: false,
  },
  {
    themeName: 'Gull',
    milestoneBadge: 'Tail Feather',
    milestoneValue: 50,
    seedCost: 50,
    comingSoon: false,
  },
  {
    themeName: 'Crane',
    milestoneBadge: 'Wing Feather',
    milestoneValue: 75,
    seedCost: 75,
    comingSoon: false,
  },
  {
    themeName: 'Woodpecker',
    milestoneBadge: 'Flight Feather',
    milestoneValue: 100,
    seedCost: 100,
    comingSoon: false,
  },
  {
    themeName: 'Blue Jay',
    milestoneBadge: 'Iridescent Feather',
    milestoneValue: 150,
    seedCost: 150,
    comingSoon: false,
  },
  {
    themeName: 'Oriole',
    milestoneBadge: 'Crest Feather',
    milestoneValue: 200,
    seedCost: 200,
    comingSoon: false,
  },
  {
    themeName: 'Heron',
    milestoneBadge: 'Plume',
    milestoneValue: 275,
    seedCost: 275,
    comingSoon: false,
  },
  {
    themeName: 'Cardinal',
    milestoneBadge: 'Quill',
    milestoneValue: 350,
    seedCost: 350,
    comingSoon: false,
  },
  {
    themeName: 'Flamingo',
    milestoneBadge: 'Bronze Feather',
    milestoneValue: 450,
    seedCost: 450,
    comingSoon: true,
  },
  {
    themeName: 'Swan',
    milestoneBadge: 'Silver Feather',
    milestoneValue: 550,
    seedCost: 550,
    comingSoon: true,
  },
  {
    themeName: 'Owl',
    milestoneBadge: 'Gold Feather',
    milestoneValue: 700,
    seedCost: 700,
    comingSoon: true,
  },
  {
    themeName: 'Hawk',
    milestoneBadge: 'Platinum Feather',
    milestoneValue: 850,
    seedCost: 850,
    comingSoon: true,
  },
  {
    themeName: 'Loon',
    milestoneBadge: 'Diamond Feather',
    milestoneValue: 1000,
    seedCost: 1000,
    comingSoon: true,
  },
  {
    themeName: 'Falcon',
    milestoneBadge: 'Opal Feather',
    milestoneValue: 1250,
    seedCost: 1250,
    comingSoon: true,
  },
  {
    themeName: 'Indigo Bunting',
    milestoneBadge: 'Phoenix Feather',
    milestoneValue: 1500,
    seedCost: 1500,
    comingSoon: true,
  },
  {
    themeName: 'Hummingbird',
    milestoneBadge: 'Aurora Feather',
    milestoneValue: 2000,
    seedCost: 2000,
    comingSoon: true,
  },
  {
    themeName: 'Toucan',
    milestoneBadge: 'Celestial Feather',
    milestoneValue: 2500,
    seedCost: 2500,
    comingSoon: true,
  },
  {
    themeName: 'Condor',
    milestoneBadge: 'Eternal Feather',
    milestoneValue: 3000,
    seedCost: 3000,
    comingSoon: true,
  },
];

export function getThemeUnlockByThemeName(themeName: string): ThemeUnlock | undefined {
  return themeUnlocks.find((themeUnlock) => themeUnlock.themeName === themeName);
}

export function getThemeUnlockByMilestoneValue(milestoneValue: number): ThemeUnlock | undefined {
  return themeUnlocks.find((themeUnlock) => themeUnlock.milestoneValue === milestoneValue);
}