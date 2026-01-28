import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Rank images
const RANK_IMAGES = [
  require('../assets/images/ranks/rank_1_debutant.png'),
  require('../assets/images/ranks/rank_2_jogger.png'),
  require('../assets/images/ranks/rank_3_coureur.png'),
  require('../assets/images/ranks/rank_4_athlete.png'),
  require('../assets/images/ranks/rank_5_champion.png'),
  require('../assets/images/ranks/rank_6_maitre.png'),
];

export default function LoadingScreen() {
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 0.95, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Rotation des badges
    Animated.loop(
      Animated.timing(orbitRotation, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin = orbitRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseSpin = orbitRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  const ORBIT_RADIUS = 100;

  return (
    <LinearGradient colors={['#0a0a1a', '#12122a', '#0a0a1a']} style={styles.container}>
      {/* Orbit area */}
      <View style={styles.orbitArea}>
        {/* Dashed orbit ring */}
        <View style={styles.orbitRing} />

        {/* Rotating badges */}
        <Animated.View style={[styles.badgesContainer, { transform: [{ rotate: spin }] }]}>
          {RANK_IMAGES.map((img, i) => {
            const angle = (i * 60 - 90) * (Math.PI / 180);
            return (
              <Animated.View
                key={i}
                style={[styles.badgeWrapper, {
                  transform: [
                    { translateX: Math.cos(angle) * ORBIT_RADIUS },
                    { translateY: Math.sin(angle) * ORBIT_RADIUS },
                    { rotate: reverseSpin },
                  ],
                }]}
              >
                <Image source={img} style={styles.badgeImg} />
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Center logo */}
        <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoGlow} />
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🏃</Text>
          </View>
        </Animated.View>
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.titleBlue}>RUN</Text>
        <Text style={styles.titleGold}>LEVELING</Text>
      </View>

      <Text style={styles.tagline}>Cours. Monte en niveau. Deviens légende.</Text>

      {/* Loading dots */}
      <LoadingDots />
    </LinearGradient>
  );
}

function LoadingDots() {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  
  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  return (
    <View style={styles.dotsRow}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[styles.dot, {
          opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
        }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbitArea: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  orbitRing: { 
    position: 'absolute', 
    width: 240, height: 240, 
    borderRadius: 120, 
    borderWidth: 1, 
    borderColor: 'rgba(59, 130, 246, 0.25)', 
    borderStyle: 'dashed' 
  },
  badgesContainer: { position: 'absolute', width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  badgeWrapper: { position: 'absolute' },
  badgeImg: { width: 36, height: 36, borderRadius: 18 },
  logoArea: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  logoGlow: { 
    position: 'absolute', 
    width: 95, height: 95, 
    borderRadius: 47.5, 
    backgroundColor: 'rgba(59, 130, 246, 0.25)' 
  },
  logoCircle: { 
    width: 75, height: 75, 
    borderRadius: 37.5, 
    backgroundColor: '#1a1a3a', 
    alignItems: 'center', justifyContent: 'center', 
    borderWidth: 3, 
    borderColor: '#3B82F6' 
  },
  logoEmoji: { fontSize: 34 },
  titleRow: { flexDirection: 'row', marginTop: 20 },
  titleBlue: { fontSize: 28, fontWeight: '900', color: '#3B82F6', letterSpacing: 3 },
  titleGold: { fontSize: 28, fontWeight: '900', color: '#F59E0B', letterSpacing: 2 },
  tagline: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  dotsRow: { flexDirection: 'row', marginTop: 25, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
});
