import type { PlayerStats, Quest } from './types';
import { dayKey, weekKey } from './time';

// On stocke les clés de reset directement dans stats.run.lastUpdateAt via meta simplifiée
// Pour rester “1 seul objet stats”, on utilise deux champs internes ajoutés dynamiquement.
type InternalMeta = PlayerStats & { _dayKey?: string; _weekKey?: string };

export function resetQuestsIfNeeded(stats: PlayerStats): void {
  const s = stats as InternalMeta;

  const dk = dayKey();
  const wk = weekKey();

  if (!s._dayKey) s._dayKey = dk;
  if (!s._weekKey) s._weekKey = wk;

  if (s._dayKey !== dk) {
    // reset daily
    for (const q of stats.quests) {
      if (q.type === 'daily') {
        q.progress = 0;
        q.completed = false;
        q.completedAt = undefined;
      }
    }
    s._dayKey = dk;
  }

  if (s._weekKey !== wk) {
    // reset weekly
    for (const q of stats.quests) {
      if (q.type === 'weekly') {
        q.progress = 0;
        q.completed = false;
        q.completedAt = undefined;
      }
    }
    s._weekKey = wk;
  }
}

export type QuestCompleteResult = {
  completedNow: Quest[];
  gainedXp: number;
};

function completeIfReached(q: Quest): boolean {
  if (q.completed) return false;
  if (q.progress >= q.goal) {
    q.completed = true;
    q.completedAt = Date.now();
    return true;
  }
  return false;
}

export function applyQuestProgress(
  stats: PlayerStats,
  deltaMeters: number,
  didFinishRun: boolean
): QuestCompleteResult {
  const completedNow: Quest[] = [];
  let gainedXp = 0;

  // distance-based quests
  for (const q of stats.quests) {
    if (q.id === 'd_km_2' || q.id === 'w_km_10') {
      q.progress += Math.max(0, Math.floor(deltaMeters));
      if (completeIfReached(q)) {
        completedNow.push(q);
        gainedXp += q.rewardXp;
      }
    }
  }

  // run-count quests (on les incrémente à la fin d’une session)
  if (didFinishRun) {
    for (const q of stats.quests) {
      if (q.id === 'd_run_1' || q.id === 'w_run_3') {
        q.progress += 1;
        if (completeIfReached(q)) {
          completedNow.push(q);
          gainedXp += q.rewardXp;
        }
      }
    }
  }

  return { completedNow, gainedXp };
}