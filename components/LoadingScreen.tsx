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
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;

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
  }, []);

  const spin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const ORBIT_RADIUS = 110;
  const BADGE_SIZE = 40;

  return (
    <LinearGradient
      colors={['#0a0a1a', '#151530', '#0d0d20', '#050510']}
      locations={[0, 0.35, 0.7, 1]}
      style={styles.container}
    >
      {/* Subtle ambient glow - background layer */}
      <View style={[styles.ambientGlow, styles.glowBlue]} />
      <View style={[styles.ambientGlow, styles.glowGold]} />

      {/* Main content - foreground layer */}
      <View style={styles.mainContent}>
        {/* Orbit ring */}
        <View style={[styles.orbitRing, { width: ORBIT_RADIUS * 2 + BADGE_SIZE + 20, height: ORBIT_RADIUS * 2 + BADGE_SIZE + 20 }]} />

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
          <View style={styles.logoGlow} />
          
          {/* Logo circle */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🏃</Text>
          </View>
        </Animated.View>

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
  },
  ambientGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.15,
  },
  glowBlue: {
    backgroundColor: '#3B82F6',
    top: 80,
    left: -30,
  },
  glowGold: {
    backgroundColor: '#F59E0B',
    bottom: 120,
    right: -30,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 280,
  },
  orbitBadge: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  badgeImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderStyle: 'dashed',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    opacity: 0.25,
  },
  logoCircle: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  logoIcon: {
    fontSize: 38,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 25,
  },
  titleRun: {
    fontSize: 32,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 4,
  },
  titleLeveling: {
    fontSize: 32,
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
