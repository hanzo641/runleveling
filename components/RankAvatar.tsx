import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image, ImageSourcePropType } from 'react-native';

// Import rank images
const RANK_IMAGES: { [key: string]: ImageSourcePropType } = {
  debutant: require('../assets/images/ranks/rank_1_debutant.png'),
  jogger: require('../assets/images/ranks/rank_2_jogger.png'),
  coureur: require('../assets/images/ranks/rank_3_coureur.png'),
  athlete: require('../assets/images/ranks/rank_4_athlete.png'),
  champion: require('../assets/images/ranks/rank_5_champion.png'),
  maitre: require('../assets/images/ranks/rank_6_maitre.png'),
};

interface RankAvatarProps {
  rankId: string;
  size?: number;
  showGlow?: boolean;
}

export default function RankAvatar({ rankId, size = 80, showGlow = true }: RankAvatarProps) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (showGlow && ['athlete', 'champion', 'maitre'].includes(rankId)) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.9,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      glowAnimation.start();

      return () => {
        pulseAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [rankId, showGlow]);

  const getGlowColor = () => {
    switch (rankId) {
      case 'debutant': return '#6B7280';
      case 'jogger': return '#10B981';
      case 'coureur': return '#3B82F6';
      case 'athlete': return '#8B5CF6';
      case 'champion': return '#F59E0B';
      case 'maitre': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const imageSource = RANK_IMAGES[rankId] || RANK_IMAGES.debutant;

  return (
    <View style={[styles.container, { width: size * 1.3, height: size * 1.3 }]}>
      {showGlow && (
        <Animated.View 
          style={[
            styles.glow, 
            { 
              backgroundColor: getGlowColor(),
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: size * 0.6,
              transform: [{ scale: pulseScale }],
              opacity: glowOpacity,
            },
          ]} 
        />
      )}
      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  image: {
    zIndex: 1,
  },
});
