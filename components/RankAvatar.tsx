import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image, ImageSourcePropType } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
  progressToNextRank?: number; // 0-100 percentage
  nextRankColor?: string;
}

export default function RankAvatar({ 
  rankId, 
  size = 80, 
  showGlow = true,
  progressToNextRank,
  nextRankColor 
}: RankAvatarProps) {
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
  
  // Progress circle calculations
  const showProgress = progressToNextRank !== undefined && progressToNextRank >= 0;
  const strokeWidth = 4;
  const radius = (size / 2) + 6;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (circumference * (progressToNextRank || 0)) / 100;
  const progressColor = nextRankColor || getGlowColor();

  return (
    <View style={[styles.container, { width: size * 1.4, height: size * 1.4 }]}>
      {showGlow && (
        <Animated.View 
          style={[
            styles.glow, 
            { 
              backgroundColor: getGlowColor(),
              width: size * 1.1,
              height: size * 1.1,
              borderRadius: size * 0.55,
              transform: [{ scale: pulseScale }],
              opacity: glowOpacity,
            },
          ]} 
        />
      )}
      
      {/* Progress Ring */}
      {showProgress && (
        <View style={styles.progressRingContainer}>
          <Svg width={size + 20} height={size + 20} style={styles.progressSvg}>
            {/* Background circle */}
            <Circle
              cx={(size + 20) / 2}
              cy={(size + 20) / 2}
              r={radius}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={(size + 20) / 2}
              cy={(size + 20) / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              transform={`rotate(-90, ${(size + 20) / 2}, ${(size + 20) / 2})`}
            />
          </Svg>
        </View>
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
  progressRingContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    transform: [{ rotate: '0deg' }],
  },
  image: {
    zIndex: 1,
  },
});
