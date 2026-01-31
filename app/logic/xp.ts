import type { PlayerStats } from './types';
import { levelFromXp, computeRankId } from './ranks';

export type XpResult = {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
};

export function addXp(stats: PlayerStats, amount: number): XpResult {
  const oldLevel = stats.level;
  stats.xp += Math.max(0, Math.floor(amount));
  stats.level = levelFromXp(stats.xp);
  stats.rankId = computeRankId(stats.level);

  return {
    leveledUp: stats.level > oldLevel,
    oldLevel,
    newLevel: stats.level,
  };
}