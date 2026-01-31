import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_STATS } from './constants';
import type { PlayerStats } from './types';

export async function loadStats(): Promise<PlayerStats | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_STATS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerStats;
  } catch {
    return null;
  }
}

export async function saveStats(stats: PlayerStats): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
}