import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_LOCATION_TASK, BACKGROUND_LOCATIONS_KEY } from './constants';

export type StoredLocationPoint = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  timestamp: number;
};

function safeParseArray(raw: string | null): StoredLocationPoint[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as StoredLocationPoint[]) : [];
  } catch {
    return [];
  }
}

// ✅ IMPORTANT: defineTask DOIT être défini au niveau module (hors composant)
const globalAny: any = globalThis as any;

if (Platform.OS !== 'web' && !globalAny.__RUNLEVELING_BG_TASK_DEFINED__) {
  globalAny.__RUNLEVELING_BG_TASK_DEFINED__ = true;

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }

    try {
      const locations = data?.locations;
      if (!locations || locations.length === 0) return;

      const stored = await AsyncStorage.getItem(BACKGROUND_LOCATIONS_KEY);
      const previous = safeParseArray(stored);

      const newPoints: StoredLocationPoint[] = locations.map((loc: any) => ({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude ?? null,
        speed: loc.coords.speed ?? null,
        timestamp: loc.timestamp,
      }));

      const merged = [...previous, ...newPoints].slice(-1000);

      await AsyncStorage.setItem(BACKGROUND_LOCATIONS_KEY, JSON.stringify(merged));

      console.log(BG: stored ${newPoints.length} points, total=${merged.length});
    } catch (e) {
      console.error('Error storing background locations:', e);
    }
  });
}

export async function requestLocationPermissions(): Promise<{
  fg: boolean;
  bg: boolean;
}> {
  if (Platform.OS === 'web') return { fg: false, bg: false };

  const fgRes = await Location.requestForegroundPermissionsAsync();
  const fg = fgRes.status === 'granted';

  // BG uniquement si FG ok
  let bg = false;
  if (fg) {
    const bgRes = await Location.requestBackgroundPermissionsAsync();
    bg = bgRes.status === 'granted';
  }
  return { fg, bg };
}

export async function startBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;

  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (started) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    // iOS: il faudra aussi config côté app.json / capabilities (on fera après)
  });
}

export async function stopBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;

  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!started) return;

  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}

export async function getAndClearBgPoints(): Promise<StoredLocationPoint[]> {
  const raw = await AsyncStorage.getItem(BACKGROUND_LOCATIONS_KEY);
  const points = safeParseArray(raw);
  await AsyncStorage.removeItem(BACKGROUND_LOCATIONS_KEY);
  return points;
}