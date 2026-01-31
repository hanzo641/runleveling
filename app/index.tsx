import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, Switch } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import HeaderStats from '../components/HeaderStats';
import QuestCard from '../components/QuestCard';
import TrophyCard from '../components/TrophyCard';
import PrimaryButton from '../components/PrimaryButton';

import type { PlayerStats } from '../logic/types';
import { createDefaultStats, finishRun, startRun, tickDistance } from '../logic/game';
import { loadStats, saveStats } from '../logic/storage';
import { requestLocationPermissions, startBackgroundUpdates, stopBackgroundUpdates, getAndClearBgPoints } from '../logic/location';
import { requestNotificationPermission, setupDailyNotification } from '../logic/notifications';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Index() {
  const [stats, setStats] = useState<PlayerStats>(() => createDefaultStats());
  const [ready, setReady] = useState(false);

  const [locOk, setLocOk] = useState({ fg: false, bg: false });
  const [notifOk, setNotifOk] = useState(false);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);

  // Load
  useEffect(() => {
    (async () => {
      const s = await loadStats();
      if (s) setStats(s);
      setReady(true);
    })();
  }, []);

  // Persist
  useEffect(() => {
    if (!ready) return;
    saveStats(stats).catch(() => {});
  }, [stats, ready]);

  // Initial permissions + background updates + notifications
  useEffect(() => {
    (async () => {
      const notif = await requestNotificationPermission();
      setNotifOk(notif);

      const loc = await requestLocationPermissions();
      setLocOk(loc);

      // start bg updates if allowed
      if (loc.bg) {
        await startBackgroundUpdates();
      }

      // schedule daily notification
      if (notif) {
        await setupDailyNotification(stats);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-schedule notifications if user toggles settings
  useEffect(() => {
    if (!ready) return;
    if (notifOk) setupDailyNotification(stats).catch(() => {});
  }, [stats.notificationsEnabled, stats.notificationTime, notifOk, ready]);

  // Apply BG points when app opens / screen unlock (approx)
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const points = await getAndClearBgPoints();
      if (points.length < 2) return;

      let dist = 0;
      for (let i = 1; i < points.length; i++) {
        dist += haversineMeters(
          points[i - 1].latitude, points[i - 1].longitude,
          points[i].latitude, points[i].longitude
        );
      }

      if (dist > 0) {
        const copy = structuredClone(stats) as PlayerStats;
        const { events } = tickDistance(copy, dist);

        // feedback
        await handleEvents(events);

        setStats(copy);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const runningLabel = useMemo(() => (stats.run.isRunning ? '⏱️ En course' : '⏸️ Arrêt'), [stats.run.isRunning]);
  const runKm = useMemo(() => (stats.run.distanceMeters / 1000).toFixed(2), [stats.run.distanceMeters]);

  async function handleEvents(events: any[]) {
    for (const e of events) {
      if (e.type === 'LEVEL_UP') {
        if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (e.type === 'TROPHY_UNLOCK') {
        if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (e.type === 'QUEST_COMPLETE') {
        if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }

  async function startForegroundWatcher() {
    if (Platform.OS === 'web') return;

    if (!locOk.fg) {
      Alert.alert('Permission', 'Permission localisation non accordée.');
      return;
    }

    // reset refs
    lastPosRef.current = null;

    watcherRef.current?.remove();
    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const last = lastPosRef.current;

        if (!last) {
          lastPosRef.current = { lat: latitude, lon: longitude };
          return;
        }

        const d = haversineMeters(last.lat, last.lon, latitude, longitude);
        lastPosRef.current = { lat: latitude, lon: longitude };

        if (!stats.run.isRunning) return;

        if (d > 0 && d < 200) {
          const copy = structuredClone(stats) as PlayerStats;
          const { events } = tickDistance(copy, d);
          await handleEvents(events);
          setStats(copy);
        }
      }
    );
  }

  function stopForegroundWatcher() {
    watcherRef.current?.remove();
    watcherRef.current = null;
    lastPosRef.current = null;
  }

  async function onStartRun() {
    const copy = structuredClone(stats) as PlayerStats;
    startRun(copy);
    setStats(copy);

    await startForegroundWatcher();

    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  async function onFinishRun() {
    stopForegroundWatcher();

    const copy = structuredClone(stats) as PlayerStats;
    const { events } = finishRun(copy);
    await handleEvents(events);

    setStats(copy);

    Alert.alert('Run terminé', Distance: ${(copy.run.distanceMeters / 1000).toFixed(2)} km);
  }

  async function onToggleBg(enabled: boolean) {
    const copy = structuredClone(stats) as PlayerStats;

    if (enabled) {
      const loc = await requestLocationPermissions();
      setLocOk(loc);
      if (!loc.bg) {
        Alert.alert('Permission', 'Permission background refusée.');
        return;
      }
      await startBackgroundUpdates();
      copy.notificationsEnabled = true;
    } else {
      await stopBackgroundUpdates();
    }

    setStats(copy);
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: '800' }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HeaderStats stats={stats} />

      <View style={styles.section}>
        <Text style={styles.h2}>🏃 Course</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.badge}>{runningLabel}</Text>
          <Text style={styles.badge}>📏 {runKm} km</Text>
        </View>

        <View style={{ height: 10 }} />

        {!stats.run.isRunning ? (
          <PrimaryButton title="Démarrer" onPress={onStartRun} />
        ) : (
          <PrimaryButton title="Terminer" onPress={onFinishRun} />
        )}

        <View style={{ height: 12 }} />

        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>⚙️ Background (téléphone verrouillé)</Text>
          <Text style={styles.settingsDesc}>
            Si activé + permissions OK, l’app collecte des points même écran verrouillé (Expo). 
            Ensuite, au retour dans l’app, on calcule la distance et on met à jour en direct.
          </Text>

          <View style={styles.rowBetween}>
            <Text style={{ fontWeight: '800' }}>Activer background</Text>
            <Switch
              value={locOk.bg}
              onValueChange={(v) => onToggleBg(v)}
              disabled={Platform.OS === 'web'}
            />
          </View>

          <Text style={{ marginTop: 8, opacity: 0.8, fontWeight: '600' }}>
            Permissions: FG={locOk.fg ? 'OK' : 'NO'} • BG={locOk.bg ? 'OK' : 'NO'} • Notifs={notifOk ? 'OK' : 'NO'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>🎯 Quêtes</Text>
        <View style={{ gap: 10 }}>
          {stats.quests.map(q => (
            <QuestCard key={q.id} q={q} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>🏆 Trophées</Text>
        <View style={{ gap: 10 }}>
          {stats.trophies.map(t => (
            <TrophyCard key={t.id} t={t} />
          ))}
        </View>
      </View>

      <View style={{ height: 24 }} />
      <Text style={{ opacity: 0.6, textAlign: 'center', fontWeight: '700' }}>
        {Platform.OS === 'web' ? 'Web: background/permissions limitées.' : 'Expo: base OK, Bare ensuite pour du 100% fiable.'}
      </Text>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  section: { gap: 10 },
  h2: { fontSize: 18, fontWeight: '900' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, fontWeight: '800' },

  settingsCard: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  settingsTitle: { fontWeight: '900', marginBottom: 6 },
  settingsDesc: { opacity: 0.75, marginBottom: 10, fontWeight: '600' },
});