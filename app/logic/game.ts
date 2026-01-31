import type { PlayerStats } from './types';
import { DEFAULT_QUESTS, DEFAULT_TROPHIES } from './constants';
import { addXp } from './xp';
import { evaluateTrophies } from './trophies';
import { resetQuestsIfNeeded, applyQuestProgress } from './quests';
import { dayKey } from './time';

export function createDefaultStats(): PlayerStats {
  return {
    xp: 0,
    level: 1,
    rankId: 'debutant',

    totalDistanceMeters: 0,
    totalRuns: 0,

    streak: 0,
    lastActiveDayKey: undefined,

    trophies: DEFAULT_TROPHIES.map(t => ({ ...t })),
    quests: DEFAULT_QUESTS.map(q => ({ ...q })),

    notificationsEnabled: true,
    notificationTime: '09:00',

    run: {
      isRunning: false,
      startedAt: undefined,
      lastUpdateAt: undefined,
      distanceMeters: 0,
      pointsStored: 0,
    },
  };
}

export type GameEvent =
  | { type: 'LEVEL_UP'; newLevel: number }
  | { type: 'TROPHY_UNLOCK'; trophyTitle: string }
  | { type: 'QUEST_COMPLETE'; questTitle: string; rewardXp: number }
  | { type: 'RUN_FINISHED'; distanceMeters: number; gainedXp: number };

function updateStreak(stats: PlayerStats): void {
  const today = dayKey();
  const last = stats.lastActiveDayKey;

  if (!last) {
    stats.streak = 1;
    stats.lastActiveDayKey = today;
    return;
  }

  if (last === today) return;

  // diff en jours
  const d1 = new Date(last + 'T00:00:00').getTime();
  const d2 = new Date(today + 'T00:00:00').getTime();
  const diffDays = Math.round((d2 - d1) / 86400000);

  if (diffDays === 1) stats.streak += 1;
  else stats.streak = 1;

  stats.lastActiveDayKey = today;
}

export function tickDistance(stats: PlayerStats, deltaMeters: number): { events: GameEvent[] } {
  const events: GameEvent[] = [];

  resetQuestsIfNeeded(stats);
  updateStreak(stats);

  stats.totalDistanceMeters += Math.max(0, Math.floor(deltaMeters));
  stats.run.distanceMeters += Math.max(0, Math.floor(deltaMeters));

  // XP “live” pendant la course : 1 xp / 20m (exemple)
  const liveXp = Math.floor(deltaMeters / 20);
  if (liveXp > 0) {
    const xpRes = addXp(stats, liveXp);
    if (xpRes.leveledUp) events.push({ type: 'LEVEL_UP', newLevel: xpRes.newLevel });
  }

  // Quêtes distance
  const qRes = applyQuestProgress(stats, deltaMeters, false);
  if (qRes.completedNow.length > 0) {
    // Récompense XP des quêtes
    const xpRes = addXp(stats, qRes.gainedXp);
    for (const q of qRes.completedNow) {
      events.push({ type: 'QUEST_COMPLETE', questTitle: q.title, rewardXp: q.rewardXp });
    }
    if (xpRes.leveledUp) events.push({ type: 'LEVEL_UP', newLevel: xpRes.newLevel });
  }

  // Trophées
  const tRes = evaluateTrophies(stats);
  for (const t of tRes.unlocked) {
    events.push({ type: 'TROPHY_UNLOCK', trophyTitle: t.title });
  }

  return { events };
}

export function startRun(stats: PlayerStats): void {
  stats.run.isRunning = true;
  stats.run.startedAt = Date.now();
  stats.run.lastUpdateAt = Date.now();
  stats.run.distanceMeters = 0;
  stats.run.pointsStored = 0;
}

export function finishRun(stats: PlayerStats): { events: GameEvent[]; gainedXp: number } {
  const events: GameEvent[] = [];

  resetQuestsIfNeeded(stats);
  updateStreak(stats);

  const distance = stats.run.distanceMeters;

  stats.totalRuns += 1;

  // XP fin de run : bonus 50 + 1xp/10m
  const bonusXp = 50 + Math.floor(distance / 10);
  const xpRes = addXp(stats, bonusXp);
  if (xpRes.leveledUp) events.push({ type: 'LEVEL_UP', newLevel: xpRes.newLevel });

  // Quêtes run-count
  const qRes = applyQuestProgress(stats, 0, true);
  if (qRes.completedNow.length > 0) {
    const xpRes2 = addXp(stats, qRes.gainedXp);
    for (const q of qRes.completedNow) {
      events.push({ type: 'QUEST_COMPLETE', questTitle: q.title, rewardXp: q.rewardXp });
    }
    if (xpRes2.leveledUp) events.push({ type: 'LEVEL_UP', newLevel: xpRes2.newLevel });
  }

  // Trophées
  const tRes = evaluateTrophies(stats);
  for (const t of tRes.unlocked) {
    events.push({ type: 'TROPHY_UNLOCK', trophyTitle: t.title });
  }

  stats.run.isRunning = false;
  stats.run.lastUpdateAt = Date.now();

  events.push({ type: 'RUN_FINISHED', distanceMeters: distance, gainedXp: bonusXp });

  return { events, gainedXp: bonusXp };
