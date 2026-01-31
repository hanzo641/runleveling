import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RANKS } from '../logic/constants';
import type { PlayerStats } from '../logic/types';

export default function HeaderStats({ stats }: { stats: PlayerStats }) {
  const rank = RANKS.find(r => r.id === stats.rankId) ?? RANKS[0];

  const km = (stats.totalDistanceMeters / 1000).toFixed(2);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {rank.icon} {rank.name}
      </Text>
      <View style={styles.row}>
        <Text style={styles.item}>Lvl {stats.level}</Text>
        <Text style={styles.item}>XP {stats.xp}</Text>
        <Text style={styles.item}>🔥 {stats.streak}</Text>
      </View>
      <Text style={styles.sub}>Total: {km} km • Runs: {stats.totalRuns}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, backgroundColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  item: { fontWeight: '700' },
  sub: { opacity: 0.7, fontWeight: '600' },
});