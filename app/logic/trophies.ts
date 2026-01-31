import type { PlayerStats, Trophy } from './types';

export type TrophyUnlock = { unlocked: Trophy[] };

function unlock(stats: PlayerStats, trophyId: string): Trophy | null {
  const t = stats.trophies.find(x => x.id === trophyId);
  if (!t) return null;
  if (t.unlocked) return null;
  t.unlocked = true;
  t.unlockedAt = Date.now();
  return t;
}

export function evaluateTrophies(stats: PlayerStats): TrophyUnlock {
  const unlocked: Trophy[] = [];

  if (stats.totalRuns >= 1) {
    const u = unlock(stats, 'first_run');
    if (u) unlocked.push(u);
  }
  if (stats.totalDistanceMeters >= 1000) {
    const u = unlock(stats, 'first_km');
    if (u) unlocked.push(u);
  }
  if (stats.totalDistanceMeters >= 10000) {
    const u = unlock(stats, '10_km');
    if (u) unlocked.push(u);
  }
  if (stats.level >= 5) {
    const u = unlock(stats, 'level_5');
    if (u) unlocked.push(u);
  }
  if (stats.level >= 10) {
    const u = unlock(stats, 'level_10');
    if (u) unlocked.push(u);
  }
  if (stats.streak >= 3) {
    const u = unlock(stats, 'streak_3');
    if (u) unlocked.push(u);
  }
  if (stats.streak >= 7) {
    const u = unlock(stats, 'streak_7');
    if (u) unlocked.push(u);
  }

  return { unlocked };
}