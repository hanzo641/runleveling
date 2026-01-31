import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Trophy } from '../logic/types';

export default function TrophyCard({ t }: { t: Trophy }) {
  return (
    <View style={[styles.card, t.unlocked ? styles.unlocked : styles.locked]}>
      <Text style={styles.title}>
        {t.icon} {t.title}
      </Text>
      <Text style={styles.desc}>{t.description}</Text>
      <Text style={styles.meta}>{t.unlocked ? '✅ Débloqué' : '🔒 Verrouillé'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 12, borderWidth: 1 },
  unlocked: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  locked: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  title: { fontWeight: '900', marginBottom: 6 },
  desc: { opacity: 0.75, marginBottom: 8 },
  meta: { fontWeight: '800', opacity: 0.8 },
});