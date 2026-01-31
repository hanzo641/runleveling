import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Quest } from '../logic/types';

export default function QuestCard({ q }: { q: Quest }) {
  const pct = Math.min(1, q.progress / q.goal);
  const pctTxt = Math.round(pct * 100);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {q.type === 'daily' ? '📅 ' : '🗓️ '} {q.title}
      </Text>
      <Text style={styles.desc}>{q.description}</Text>
      <Text style={styles.meta}>
        {q.completed ? '✅ Complétée' : `Progression: ${pctTxt}%`} • +{q.rewardXp} XP
      </Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: ${pctTxt}% }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontWeight: '800', marginBottom: 6 },
  desc: { opacity: 0.75, marginBottom: 8 },
  meta: { fontWeight: '700', marginBottom: 8, opacity: 0.8 },
  bar: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 99, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: '#111827' },
});