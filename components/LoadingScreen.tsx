import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Rank images
const RANK_IMAGES = [
  { id: 'debutant', source: require('../assets/images/ranks/rank_1_debutant.png') },
  { id: 'jogger', source: require('../assets/images/ranks/rank_2_jogger.png') },
  { id: 'coureur', source: require('../assets/images/ranks/rank_3_coureur.png') },
  { id: 'athlete', source: require('../assets/images/ranks/rank_4_athlete.png') },
  { id: 'champion', source: require('../assets/images/ranks/rank_5_champion.png') },
  { id: 'maitre', source: require('../assets/images/ranks/rank_6_maitre.png') },
];

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

export default function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Logo pulse animation
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

    // Animation de rotation continue des badges
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animation de pulse du glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.7,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
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

  const ORBIT_RADIUS = 115;
  const BADGE_SIZE = 42;

  return (
    <LinearGradient
      colors={['#0a0a1a', '#151530', '#0d0d20', '#050510']}
      locations={[0, 0.35, 0.7, 1]}
      style={styles.container}
    >
      {/* Ambient glow effects */}
      <Animated.View style={[styles.ambientGlow, styles.glowBlue, { opacity: glowPulse }]} />
      <Animated.View style={[styles.ambientGlow, styles.glowGold, { opacity: glowPulse }]} />

      {/* Central content container */}
      <View style={styles.centerContent}>
        {/* Orbit ring */}
        <View style={[styles.orbitRing, { width: ORBIT_RADIUS * 2 + BADGE_SIZE + 10, height: ORBIT_RADIUS * 2 + BADGE_SIZE + 10 }]} />

        {/* Orbiting badges */}
        <Animated.View
          style={[
            styles.orbitContainer,
            { transform: [{ rotate: spin }] },
          ]}
        >
          {RANK_IMAGES.map((rank, index) => {
            const angle = (index * 60 - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * ORBIT_RADIUS;
            const y = Math.sin(angle) * ORBIT_RADIUS;

            return (
              <Animated.View
                key={rank.id}
                style={[
                  styles.orbitBadge,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { rotate: reverseSpin },
                    ],
                  },
                ]}
              >
                <Image
                  source={rank.source}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Central Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }] },
          ]}
        >
          {/* Glow behind logo */}
          <Animated.View style={[styles.logoGlow, { opacity: glowPulse }]} />
          
          {/* Logo circle */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🏃</Text>
          </View>
        </Animated.View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleRun}>RUN</Text>
        <Text style={styles.titleLeveling}>LEVELING</Text>
      </View>

      {/* Tagline */}
      <Text style={styles.tagline}>Cours. Monte en niveau. Deviens légende.</Text>

      {/* Loading dots */}
      <View style={styles.loadingDots}>
        <LoadingDots />
      </View>
    </LinearGradient>
  );
}

// Composant pour les points de chargement animés
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [{
      scale: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.3],
      }),
    }],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    zIndex: 0,
  },
  glowBlue: {
    backgroundColor: '#3B82F6',
    top: SCREEN_HEIGHT * 0.1,
    left: -60,
    opacity: 0.2,
  },
  glowGold: {
    backgroundColor: '#F59E0B',
    bottom: SCREEN_HEIGHT * 0.1,
    right: -60,
    opacity: 0.15,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 300,
    height: 300,
    zIndex: 10,
  },
  orbitContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 300,
    height: 300,
  },
  orbitBadge: {
    position: 'absolute',
    width: 42,
    height: 42,
  },
  badgeImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderStyle: 'dashed',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#3B82F6',
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  logoIcon: {
    fontSize: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 25,
  },
  titleRun: {
    fontSize: 34,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 4,
  },
  titleLeveling: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 2,
  },
  tagline: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  loadingDots: {
    marginTop: 35,
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
