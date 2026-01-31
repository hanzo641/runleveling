import { RANKS } from './constants';

export function computeRankId(level: number): string {
  const sorted = [...RANKS].sort((a, b) => a.minLevel - b.minLevel);
  let current = sorted[0]?.id ?? 'debutant';
  for (const r of sorted) {
    if (level >= r.minLevel) current = r.id;
  }
  return current;
}

export function levelFromXp(xp: number): number {
  // courbe simple: niveau = floor(sqrt(xp/100)) + 1
  // 0..99 => lvl1, 100..399 => lvl2, etc
  const lvl = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  return Math.max(1, lvl);
}