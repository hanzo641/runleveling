export type Rank = {
  id: string;
  name: string;
  minLevel: number;
  color: string;
  icon: string;
};

export type Trophy = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
};

export type QuestType = 'daily' | 'weekly';

export type Quest = {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  goal: number;          // ex: 3 km, 1 run, 500 xp...
  progress: number;
  rewardXp: number;
  completed: boolean;
  completedAt?: number;
};

export type RunSession = {
  isRunning: boolean;
  startedAt?: number;
  lastUpdateAt?: number;
  distanceMeters: number;
  pointsStored: number; // nombre de points GPS stockés
};

export type PlayerStats = {
  xp: number;
  level: number;
  rankId: string;

  totalDistanceMeters: number;
  totalRuns: number;

  streak: number;
  lastActiveDayKey?: string; // "YYYY-MM-DD"

  trophies: Trophy[];
  quests: Quest[];

  notificationsEnabled: boolean;
  notificationTime: string; // "HH:MM"

  run: RunSession;
};