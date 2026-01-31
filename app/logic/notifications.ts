import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlayerStats } from './types';
import { APP_NAME } from './constants';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupDailyNotification(stats: PlayerStats): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!stats.notificationsEnabled) return;

  const [hours, minutes] = stats.notificationTime.split(':').map(Number);

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: APP_NAME,
      body: "C’est l’heure de ta course quotidienne ! Ne casse pas ta streak 🔥",
      sound: true,
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });
}