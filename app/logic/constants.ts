import type { Rank, Trophy, Quest } from './types';

export const APP_NAME = 'RunLeveling';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
export const BACKGROUND_LOCATIONS_KEY = 'BACKGROUND_LOCATIONS_KEY';

export const STORAGE_KEY_STATS = 'RUNLEVELING_STATS_V1';

export const EARTH_RADIUS_KM = 6371;

export const RANKS: Rank[] = [
  { id: 'debutant', name: 'Débutant', minLevel: 1,  color: '#6B7280', icon: '🐣' },
  { id: 'jogger',   name: 'Jogger',   minLevel: 11, color: '#10B981', icon: '🏃' },
  { id: 'coureur',  name: 'Coureur',  minLevel: 26, color: '#3B82F6', icon: '🥈' },
  { id: 'athlete',  name: 'Athlète',  minLevel: 46, color: '#8B5CF6', icon: '💪' },
  { id: 'champion', name: 'Champion', minLevel: 71, color: '#F59E0B', icon: '🏆' },
  { id: 'maitre',   name: 'Maître',   minLevel: 91, color: '#EF4444', icon: '👑' },
];

export const DEFAULT_TROPHIES: Trophy[] = [
  { id: 'first_run', title: 'Premier run', description: 'Terminer ta première course', icon: '🏁', unlocked: false },
  { id: 'first_km', title: 'Premier kilomètre', description: 'Atteindre 1 km au total', icon: '🧭', unlocked: false },
  { id: '10_km', title: '10 km', description: 'Atteindre 10 km au total', icon: '🗺️', unlocked: false },
  { id: 'level_5', title: 'Niveau 5', description: 'Atteindre le niveau 5', icon: '⭐', unlocked: false },
  { id: 'level_10', title: 'Niveau 10', description: 'Atteindre le niveau 10', icon: '🌟', unlocked: false },
  { id: 'streak_3', title: 'Streak x3', description: '3 jours consécutifs actif', icon: '🔥', unlocked: false },
  { id: 'streak_7', title: 'Streak x7', description: '7 jours consécutifs actif', icon: '🔥🔥', unlocked: false },
];

export const DEFAULT_QUESTS: Quest[] = [
  // Daily
  { id: 'd_run_1', type: 'daily', title: 'Sortir courir', description: 'Faire 1 session aujourd’hui', goal: 1, progress: 0, rewardXp: 120, completed: false },
  { id: 'd_km_2',  type: 'daily', title: '2 km', description: 'Courir 2 km aujourd’hui', goal: 2000, progress: 0, rewardXp: 160, completed: false },

  // Weekly
  { id: 'w_km_10', type: 'weekly', title: '10 km semaine', description: 'Courir 10 km cette semaine', goal: 10000, progress: 0, rewardXp: 700, completed: false },
  { id: 'w_run_3', type: 'weekly', title: '3 sessions', description: 'Faire 3 sessions cette semaine', goal: 3, progress: 0, rewardXp: 600, completed: false },
];