import type { Milestone } from '@/types';

export interface IntermediateMilestone {
  value: number;
  rewardSeeds: number;
  description: string;
  achievement: string;
}

export type ProgressMilestone = Milestone | IntermediateMilestone;

const badgeMilestones: Milestone[] = [
  {
    badge: 'Downy Feather',
    value: 10,
    description: 'A soft first feather. Every great birder starts somewhere.',
    achievement: 'Earned for correctly identifying 10 real fake birds.',
  },
  {
    badge: 'Contour Feather',
    value: 25,
    description: `Starting to take shape. You've got the look of a birder.`,
    achievement: 'Earned for correctly identifying 25 real fake birds.',
  },
  {
    badge: 'Tail Feather',
    value: 50,
    description: `A fan of feathers! You're steering in the right direction.`,
    achievement: 'Earned for correctly identifying 50 real fake birds.',
  },
  {
    badge: 'Wing Feather',
    value: 75,
    description: `Spreading your wings. The sky's getting closer.`,
    achievement: 'Earned for correctly identifying 75 real fake birds.',
  },
  {
    badge: 'Flight Feather',
    value: 100,
    description: 'Ready for takeoff. No bird can fool you now... almost.',
    achievement: 'Earned for correctly identifying 100 real fake birds.',
  },
  {
    badge: 'Iridescent Feather',
    value: 150,
    description: 'Catching the light like a starling in the sun.',
    achievement: 'Earned for correctly identifying 150 real fake birds.',
  },
  {
    badge: 'Crest Feather',
    value: 200,
    description: `Crowned with knowledge. You're turning heads.`,
    achievement: 'Earned for correctly identifying 200 real fake birds.',
  },
  {
    badge: 'Plume',
    value: 275,
    description: 'An elegant display of birding prowess.',
    achievement: 'Earned for correctly identifying 275 real fake birds.',
  },
  {
    badge: 'Quill',
    value: 350,
    description: 'Sharp enough to write the field guide yourself.',
    achievement: 'Earned for correctly identifying 350 real fake birds.',
  },
  {
    badge: 'Bronze Feather',
    value: 450,
    description: 'Forged in the fires of a thousand wrong guesses.',
    achievement: 'Earned for correctly identifying 450 real fake birds.',
  },
  {
    badge: 'Silver Feather',
    value: 550,
    description: 'A shimmering testament to your dedication.',
    achievement: 'Earned for correctly identifying 550 real fake birds.',
  },
  {
    badge: 'Gold Feather',
    value: 700,
    description: 'Worth its weight in birdseed.',
    achievement: 'Earned for correctly identifying 700 real fake birds.',
  },
  {
    badge: 'Platinum Feather',
    value: 850,
    description: 'Rarer than a calm day at the feeder.',
    achievement: 'Earned for correctly identifying 850 real fake birds.',
  },
  {
    badge: 'Diamond Feather',
    value: 1000,
    description: `Unbreakable. Unmistakable. You're the real deal.`,
    achievement: 'Earned for correctly identifying 1,000 real fake birds.',
  },
  {
    badge: 'Opal Feather',
    value: 1250,
    description: 'Shifting colors, shifting expertise. All of it radiant.',
    achievement: 'Earned for correctly identifying 1,250 real fake birds.',
  },
  {
    badge: 'Phoenix Feather',
    value: 1500,
    description: 'Reborn after every wrong answer. You always come back.',
    achievement: 'Earned for correctly identifying 1,500 real fake birds.',
  },
  {
    badge: 'Aurora Feather',
    value: 2000,
    description: 'A once-in-a-lifetime display of birding brilliance.',
    achievement: 'Earned for correctly identifying 2,000 real fake birds.',
  },
  {
    badge: 'Transplanar Feather',
    value: 2500,
    description: 'Transcending the mortal realm of bird identification.',
    achievement: 'Earned for correctly identifying 2,500 real fake birds.',
  },
  {
    badge: 'Eternal Feather',
    value: 3000,
    description: 'Legend. Myth. Birdgod reincarnated as a feather.',
    achievement: 'Earned for correctly identifying 3,000 real fake birds.',
  },
];

const intermediateMilestones: IntermediateMilestone[] = [
  {
    value: 125,
    rewardSeeds: 25,
    description: 'A quick seed cache to keep your migration moving.',
    achievement: 'Earned for correctly identifying 125 real fake birds.',
  },
  {
    value: 375,
    rewardSeeds: 50,
    description: 'A mid-flight snack for the climb between major rewards.',
    achievement: 'Earned for correctly identifying 375 real fake birds.',
  },
  {
    value: 500,
    rewardSeeds: 50,
    description: 'Another seed cache for the long haul.',
    achievement: 'Earned for correctly identifying 500 real fake birds.',
  },
  {
    value: 600,
    rewardSeeds: 75,
    description: 'A hearty late-game payout before the next feather tier.',
    achievement: 'Earned for correctly identifying 600 real fake birds.',
  },
];

const progressMilestones: ProgressMilestone[] = [
  ...badgeMilestones,
  ...intermediateMilestones,
].sort((left, right) => left.value - right.value);

export function isBadgeMilestone(milestone: ProgressMilestone): milestone is Milestone {
  return 'badge' in milestone;
}

export function isIntermediateMilestone(
  milestone: ProgressMilestone
): milestone is IntermediateMilestone {
  return 'rewardSeeds' in milestone;
}

export function getIntermediateMilestoneByValue(
  milestoneValue: number
): IntermediateMilestone | undefined {
  return intermediateMilestones.find((milestone) => milestone.value === milestoneValue);
}

export function getProgressMilestoneByValue(
  milestoneValue: number
): ProgressMilestone | undefined {
  return progressMilestones.find((milestone) => milestone.value === milestoneValue);
}

export {
  badgeMilestones as milestones,
  intermediateMilestones,
  progressMilestones,
};
