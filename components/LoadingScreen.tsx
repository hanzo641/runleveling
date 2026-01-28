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
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const badgesOpacity = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Sequence d'animations
    Animated.sequence([
      // 1. Fade in et zoom du logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // 2. Fade in du titre
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 3. Fade in des badges
      Animated.timing(badgesOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de rotation continue des badges
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animation de pulse du glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1500,
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

  const ORBIT_RADIUS = 120;
  const BADGE_SIZE = 45;

  return (
    <LinearGradient
      colors={['#0a0a1a', '#1a1a3a', '#0f0f2a', '#050510']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      {/* Ambient glow effects */}
      <Animated.View style={[styles.ambientGlow, styles.glowBlue, { opacity: glowPulse }]} />
      <Animated.View style={[styles.ambientGlow, styles.glowGold, { opacity: glowPulse }]} />

      {/* Orbiting badges */}
      <Animated.View
        style={[
          styles.orbitContainer,
          {
            transform: [{ rotate: spin }],
            opacity: badgesOpacity,
          },
        ]}
      >
        {RANK_IMAGES.map((rank, index) => {
          const angle = (index * 60) * (Math.PI / 180);
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
                style={{ width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2 }}
                resizeMode="contain"
              />
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Orbit ring */}
      <View style={[styles.orbitRing, { width: ORBIT_RADIUS * 2 + BADGE_SIZE, height: ORBIT_RADIUS * 2 + BADGE_SIZE }]} />

      {/* Central Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Glow behind logo */}
        <Animated.View style={[styles.logoGlow, { opacity: glowPulse }]} />
        
        {/* Logo circle */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🏃</Text>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
        <Text style={styles.titleRun}>RUN</Text>
        <Text style={styles.titleLeveling}>LEVELING</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: titleOpacity }]}>
        Cours. Monte en niveau. Deviens légende.
      </Animated.Text>

      {/* Loading dots */}
      <Animated.View style={[styles.loadingDots, { opacity: titleOpacity }]}>
        <LoadingDots />
      </Animated.View>
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
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowBlue: {
    backgroundColor: '#3B82F6',
    top: SCREEN_HEIGHT * 0.2,
    left: -50,
    opacity: 0.15,
  },
  glowGold: {
    backgroundColor: '#F59E0B',
    bottom: SCREEN_HEIGHT * 0.2,
    right: -50,
    opacity: 0.1,
  },
  orbitContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitBadge: {
    position: 'absolute',
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderStyle: 'dashed',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3B82F6',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 45,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 30,
  },
  titleRun: {
    fontSize: 36,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 4,
    textShadowColor: '#3B82F6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleLeveling: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 2,
    textShadowColor: '#F59E0B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tagline: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
    letterSpacing: 1,
  },
  loadingDots: {
    marginTop: 40,
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
