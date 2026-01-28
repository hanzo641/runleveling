import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Rank images
const RANK_IMAGES = [
  { id: 'debutant', source: require('../assets/images/ranks/rank_1_debutant.png') },
  { id: 'jogger', source: require('../assets/images/ranks/rank_2_jogger.png') },
  { id: 'coureur', source: require('../assets/images/ranks/rank_3_coureur.png') },
  { id: 'athlete', source: require('../assets/images/ranks/rank_4_athlete.png') },
  { id: 'champion', source: require('../assets/images/ranks/rank_5_champion.png') },
  { id: 'maitre', source: require('../assets/images/ranks/rank_6_maitre.png') },
];

export default function LoadingScreen() {
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation des badges
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const ORBIT_RADIUS = 105;
  const BADGE_SIZE = 38;

  return (
    <LinearGradient
      colors={['#0a0a1a', '#12122a', '#0a0a1a']}
      style={styles.container}
    >
      {/* Center container for orbit */}
      <View style={styles.centerContainer}>
        {/* Orbit ring */}
        <View style={[styles.orbitRing, { 
          width: ORBIT_RADIUS * 2 + BADGE_SIZE + 20, 
          height: ORBIT_RADIUS * 2 + BADGE_SIZE + 20 
        }]} />

        {/* Orbiting badges */}
        <Animated.View style={[styles.orbitWrapper, { transform: [{ rotate: spin }] }]}>
          {RANK_IMAGES.map((rank, index) => {
            const angle = (index * 60 - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * ORBIT_RADIUS;
            const y = Math.sin(angle) * ORBIT_RADIUS;

            return (
              <Animated.View
                key={rank.id}
                style={[
                  styles.badge,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { rotate: reverseSpin },
                    ],
                  },
                ]}
              >
                <Image source={rank.source} style={styles.badgeImage} resizeMode="contain" />
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Central logo */}
        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
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

      {/* Tagline */}
      <Text style={styles.tagline}>Cours. Monte en niveau. Deviens légende.</Text>

      {/* Loading indicator */}
      <View style={styles.dotsRow}>
        <LoadingDots />
      </View>
    </LinearGradient>
  );
}

function LoadingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderStyle: 'dashed',
  },
  orbitWrapper: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
  },
  badgeImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  logoEmoji: {
    fontSize: 36,
  },
  titleRow: {
    flexDirection: 'row',
    marginTop: 25,
  },
  titleBlue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 3,
  },
  titleGold: {
    fontSize: 30,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 2,
  },
  tagline: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 10,
  },
  dotsRow: {
    marginTop: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
});
