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
    seedCost: 15,
    comingSoon: false,
  },
  {
    themeName: 'Robin',
    milestoneBadge: 'Contour Feather',
    milestoneValue: 25,
    seedCost: 40,
    comingSoon: false,
  },
  {
    themeName: 'Gull',
    milestoneBadge: 'Tail Feather',
    milestoneValue: 50,
    seedCost: 80,
    comingSoon: false,
  },
  {
    themeName: 'Crane',
    milestoneBadge: 'Wing Feather',
    milestoneValue: 75,
    seedCost: 120,
    comingSoon: false,
  },
  {
    themeName: 'Woodpecker',
    milestoneBadge: 'Flight Feather',
    milestoneValue: 100,
    seedCost: 175,
    comingSoon: false,
  },
  {
    themeName: 'Blue Jay',
    milestoneBadge: 'Iridescent Feather',
    milestoneValue: 150,
    seedCost: 300,
    comingSoon: false,
  },
  {
    themeName: 'Oriole',
    milestoneBadge: 'Crest Feather',
    milestoneValue: 200,
    seedCost: 450,
    comingSoon: false,
  },
  {
    themeName: 'Heron',
    milestoneBadge: 'Plume',
    milestoneValue: 275,
    seedCost: 550,
    comingSoon: false,
  },
  {
    themeName: 'Cardinal',
    milestoneBadge: 'Quill',
    milestoneValue: 350,
    seedCost: 700,
    comingSoon: false,
  },
  {
    themeName: 'Flamingo',
    milestoneBadge: 'Bronze Feather',
    milestoneValue: 450,
    seedCost: 850,
    comingSoon: false,
  },
  {
    themeName: 'Swan',
    milestoneBadge: 'Silver Feather',
    milestoneValue: 550,
    seedCost: 1000,
    comingSoon: false,
  },
  {
    themeName: 'Owl',
    milestoneBadge: 'Gold Feather',
    milestoneValue: 700,
    seedCost: 1200,
    comingSoon: false,
  },
  {
    themeName: 'Hawk',
    milestoneBadge: 'Platinum Feather',
    milestoneValue: 850,
    seedCost: 1450,
    comingSoon: true,
  },
  {
    themeName: 'Loon',
    milestoneBadge: 'Diamond Feather',
    milestoneValue: 1000,
    seedCost: 1700,
    comingSoon: true,
  },
  {
    themeName: 'Falcon',
    milestoneBadge: 'Opal Feather',
    milestoneValue: 1250,
    seedCost: 2000,
    comingSoon: true,
  },
  {
    themeName: 'Indigo Bunting',
    milestoneBadge: 'Phoenix Feather',
    milestoneValue: 1500,
    seedCost: 2300,
    comingSoon: true,
  },
  {
    themeName: 'Hummingbird',
    milestoneBadge: 'Aurora Feather',
    milestoneValue: 2000,
    seedCost: 2700,
    comingSoon: true,
  },
  {
    themeName: 'Toucan',
    milestoneBadge: 'Transplanar Feather',
    milestoneValue: 2500,
    seedCost: 3200,
    comingSoon: true,
  },
  {
    themeName: 'Condor',
    milestoneBadge: 'Eternal Feather',
    milestoneValue: 3000,
    seedCost: 3800,
    comingSoon: true,
  },
];

export function getThemeUnlockByThemeName(themeName: string): ThemeUnlock | undefined {
  return themeUnlocks.find((themeUnlock) => themeUnlock.themeName === themeName);
}

export function getThemeUnlockByMilestoneValue(milestoneValue: number): ThemeUnlock | undefined {
  return themeUnlocks.find((themeUnlock) => themeUnlock.milestoneValue === milestoneValue);
}