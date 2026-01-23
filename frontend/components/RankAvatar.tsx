import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { 
  Path, 
  Circle, 
  G, 
  Defs, 
  LinearGradient, 
  Stop, 
  RadialGradient,
  Line,
  Ellipse
} from 'react-native-svg';

interface RankAvatarProps {
  rankId: string;
  size?: number;
  showGlow?: boolean;
}

export default function RankAvatar({ rankId, size = 80, showGlow = true }: RankAvatarProps) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showGlow && ['champion', 'maitre'].includes(rankId)) {
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
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.4,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      glowAnimation.start();

      // Rotation for Maître aura
      if (rankId === 'maitre') {
        const rotateAnimation = Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        rotateAnimation.start();
      }

      return () => {
        pulseAnimation.stop();
        glowAnimation.stop();
      };
    }
  }, [rankId, showGlow]);

  const renderAvatar = () => {
    switch (rankId) {
      case 'debutant':
        return <DebutantAvatar size={size} />;
      case 'jogger':
        return <JoggerAvatar size={size} />;
      case 'coureur':
        return <CoureurAvatar size={size} />;
      case 'athlete':
        return <AthleteAvatar size={size} />;
      case 'champion':
        return <ChampionAvatar size={size} />;
      case 'maitre':
        return <MaitreAvatar size={size} />;
      default:
        return <DebutantAvatar size={size} />;
    }
  };

  const getGlowColor = () => {
    switch (rankId) {
      case 'athlete': return '#8B5CF6';
      case 'champion': return '#F59E0B';
      case 'maitre': return '#EF4444';
      default: return 'transparent';
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Aura for Maître */}
      {showGlow && rankId === 'maitre' && (
        <Animated.View 
          style={[
            styles.auraRing, 
            { 
              width: size * 1.4,
              height: size * 1.4,
              borderRadius: size * 0.7,
              transform: [{ rotate: spin }],
              opacity: glowOpacity,
            },
          ]} 
        >
          <View style={[styles.auraSegment, styles.auraSegment1, { backgroundColor: '#EF4444' }]} />
          <View style={[styles.auraSegment, styles.auraSegment2, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.auraSegment, styles.auraSegment3, { backgroundColor: '#FCD34D' }]} />
        </Animated.View>
      )}
      
      {/* Glow effect */}
      {showGlow && ['athlete', 'champion'].includes(rankId) && (
        <Animated.View 
          style={[
            styles.glow, 
            { 
              backgroundColor: getGlowColor(),
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: size * 0.65,
              transform: [{ scale: pulseScale }],
              opacity: glowOpacity,
            },
          ]} 
        />
      )}
      {renderAvatar()}
    </View>
  );
}

// Base runner body - used by all ranks
const RunnerBody = ({ 
  size, 
  bodyColor, 
  lean = 0, 
  armSwing = 0,
  showSpeedLines = false,
  showCrown = false,
  crownColor = '#F59E0B',
  showAura = false,
}: { 
  size: number; 
  bodyColor: string;
  lean?: number;
  armSwing?: number;
  showSpeedLines?: boolean;
  showCrown?: boolean;
  crownColor?: string;
  showAura?: boolean;
}) => {
  const scale = size / 100;
  
  return (
    <G transform={`rotate(${lean}, 50, 50)`}>
      {/* Speed lines for Athlète+ */}
      {showSpeedLines && (
        <G opacity={0.6}>
          <Line x1="15" y1="35" x2="5" y2="35" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
          <Line x1="18" y1="45" x2="3" y2="45" stroke={bodyColor} strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="15" y1="55" x2="5" y2="55" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
          <Line x1="20" y1="65" x2="8" y2="65" stroke={bodyColor} strokeWidth="1.5" strokeLinecap="round" />
        </G>
      )}
      
      {/* Crown for Champion */}
      {showCrown && (
        <G>
          <Path 
            d="M38 18 L42 8 L50 14 L58 8 L62 18 Z" 
            fill={crownColor}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
          <Circle cx="50" cy="11" r="2.5" fill="#EF4444" />
        </G>
      )}
      
      {/* Head */}
      <Circle cx="50" cy="28" r="10" fill={bodyColor} />
      
      {/* Neck */}
      <Path 
        d="M47 37 L53 37 L53 40 L47 40 Z" 
        fill={bodyColor}
      />
      
      {/* Torso - athletic build */}
      <Path 
        d="M38 40 
           C38 40 36 42 36 50 
           L36 58 
           C36 60 38 62 42 62 
           L58 62 
           C62 62 64 60 64 58 
           L64 50 
           C64 42 62 40 62 40 
           Z" 
        fill={bodyColor}
      />
      
      {/* Shoulders - more defined for higher ranks */}
      <Ellipse cx="34" cy="44" rx="5" ry="4" fill={bodyColor} />
      <Ellipse cx="66" cy="44" rx="5" ry="4" fill={bodyColor} />
      
      {/* Left Arm - back swing */}
      <Path 
        d={`M34 44 
            Q${28 - armSwing} ${50 + armSwing} ${25 - armSwing} ${58 + armSwing}`}
        stroke={bodyColor}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Right Arm - forward swing */}
      <Path 
        d={`M66 44 
            Q${72 + armSwing} ${48 - armSwing} ${78 + armSwing} ${42 - armSwing}`}
        stroke={bodyColor}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Hips */}
      <Ellipse cx="50" cy="65" rx="12" ry="6" fill={bodyColor} />
      
      {/* Left Leg - back */}
      <Path 
        d="M42 65 Q35 75 28 88"
        stroke={bodyColor}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Right Leg - forward */}
      <Path 
        d="M58 65 Q68 72 75 78"
        stroke={bodyColor}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Left Foot */}
      <Ellipse cx="26" cy="90" rx="6" ry="3" fill={bodyColor} />
      
      {/* Right Foot */}
      <Ellipse cx="77" cy="80" rx="6" ry="3" fill={bodyColor} />
    </G>
  );
};

// Débutant - Simple, straight posture, relaxed
const DebutantAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="debutantBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#4B5563" />
        <Stop offset="100%" stopColor="#374151" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#debutantBg)" />
    
    {/* Simple standing runner */}
    <G>
      {/* Head */}
      <Circle cx="50" cy="25" r="9" fill="#6B7280" />
      
      {/* Body - straight */}
      <Path 
        d="M44 34 L44 55 L56 55 L56 34 Z" 
        fill="#6B7280"
        rx="3"
      />
      
      {/* Arms - relaxed down */}
      <Path d="M44 36 L38 52" stroke="#6B7280" strokeWidth="6" strokeLinecap="round" />
      <Path d="M56 36 L62 52" stroke="#6B7280" strokeWidth="6" strokeLinecap="round" />
      
      {/* Legs - standing */}
      <Path d="M46 55 L44 78" stroke="#6B7280" strokeWidth="7" strokeLinecap="round" />
      <Path d="M54 55 L56 78" stroke="#6B7280" strokeWidth="7" strokeLinecap="round" />
      
      {/* Feet */}
      <Ellipse cx="43" cy="80" rx="5" ry="3" fill="#6B7280" />
      <Ellipse cx="57" cy="80" rx="5" ry="3" fill="#6B7280" />
    </G>
  </Svg>
);

// Jogger - Slight lean forward, starting to run
const JoggerAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="joggerBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#10B981" />
        <Stop offset="100%" stopColor="#059669" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#joggerBg)" />
    
    {/* Runner with slight lean */}
    <G transform="rotate(8, 50, 70)">
      {/* Head */}
      <Circle cx="50" cy="24" r="9" fill="#FFFFFF" />
      
      {/* Body - slight lean */}
      <Path 
        d="M43 33 L43 54 L57 54 L57 33 Z" 
        fill="#FFFFFF"
      />
      
      {/* Arms - slight movement */}
      <Path d="M43 35 L32 48" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <Path d="M57 35 L68 45" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      
      {/* Legs - jogging pose */}
      <Path d="M45 54 L38 76" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <Path d="M55 54 L65 72" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      
      {/* Feet */}
      <Ellipse cx="36" cy="78" rx="5" ry="3" fill="#FFFFFF" />
      <Ellipse cx="67" cy="74" rx="5" ry="3" fill="#FFFFFF" />
    </G>
  </Svg>
);

// Coureur - Dynamic arms, more athletic
const CoureurAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="coureurBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#3B82F6" />
        <Stop offset="100%" stopColor="#1D4ED8" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#coureurBg)" />
    
    {/* Dynamic runner */}
    <G transform="rotate(12, 50, 70)">
      {/* Head */}
      <Circle cx="50" cy="22" r="9" fill="#FFFFFF" />
      
      {/* Athletic body */}
      <Path 
        d="M42 31 C40 33 40 38 40 45 L40 52 C40 54 42 56 46 56 L54 56 C58 56 60 54 60 52 L60 45 C60 38 60 33 58 31 Z" 
        fill="#FFFFFF"
      />
      
      {/* Shoulders more defined */}
      <Ellipse cx="38" cy="35" rx="4" ry="3" fill="#FFFFFF" />
      <Ellipse cx="62" cy="35" rx="4" ry="3" fill="#FFFFFF" />
      
      {/* Arms - dynamic swing */}
      <Path d="M38 35 Q28 45 22 52" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <Path d="M62 35 Q72 32 78 28" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      
      {/* Legs - running pose */}
      <Path d="M44 56 Q35 68 28 82" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Path d="M56 56 Q68 65 76 70" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      
      {/* Feet */}
      <Ellipse cx="26" cy="84" rx="5" ry="3" fill="#FFFFFF" />
      <Ellipse cx="78" cy="72" rx="5" ry="3" fill="#FFFFFF" />
    </G>
  </Svg>
);

// Athlète - Speed lines, powerful build
const AthleteAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="athleteBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#8B5CF6" />
        <Stop offset="100%" stopColor="#6D28D9" />
      </LinearGradient>
      <RadialGradient id="athleteGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#athleteBg)" />
    <Circle cx="50" cy="50" r="45" fill="url(#athleteGlow)" />
    
    {/* Speed lines */}
    <G opacity={0.7}>
      <Line x1="12" y1="35" x2="4" y2="35" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Line x1="14" y1="45" x2="2" y2="45" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="12" y1="55" x2="4" y2="55" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Powerful runner */}
    <G transform="rotate(15, 50, 70)">
      {/* Head */}
      <Circle cx="50" cy="20" r="9" fill="#FFFFFF" />
      
      {/* Muscular body */}
      <Path 
        d="M40 29 C38 31 37 36 37 43 L37 50 C37 52 39 55 44 55 L56 55 C61 55 63 52 63 50 L63 43 C63 36 62 31 60 29 Z" 
        fill="#FFFFFF"
      />
      
      {/* Broad shoulders */}
      <Ellipse cx="35" cy="33" rx="5" ry="4" fill="#FFFFFF" />
      <Ellipse cx="65" cy="33" rx="5" ry="4" fill="#FFFFFF" />
      
      {/* Powerful arms */}
      <Path d="M35 33 Q22 45 18 55" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <Path d="M65 33 Q78 28 85 22" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      
      {/* Strong legs */}
      <Path d="M42 55 Q30 70 22 85" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      <Path d="M58 55 Q72 62 82 68" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      
      {/* Feet */}
      <Ellipse cx="20" cy="87" rx="6" ry="3" fill="#FFFFFF" />
      <Ellipse cx="84" cy="70" rx="6" ry="3" fill="#FFFFFF" />
    </G>
  </Svg>
);

// Champion - Golden glow, subtle crown
const ChampionAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="championBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="100%" stopColor="#D97706" />
      </LinearGradient>
      <LinearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FEF3C7" />
        <Stop offset="50%" stopColor="#FCD34D" />
        <Stop offset="100%" stopColor="#F59E0B" />
      </LinearGradient>
      <RadialGradient id="championGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FCD34D" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#championBg)" />
    <Circle cx="50" cy="50" r="45" fill="url(#championGlow)" />
    
    {/* Speed lines */}
    <G opacity={0.8}>
      <Line x1="10" y1="32" x2="2" y2="32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="42" x2="1" y2="42" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="10" y1="52" x2="2" y2="52" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Champion runner */}
    <G transform="rotate(15, 50, 70)">
      {/* Crown */}
      <Path 
        d="M36 12 L40 4 L50 10 L60 4 L64 12 Z" 
        fill="url(#goldShine)"
      />
      <Circle cx="50" cy="7" r="2" fill="#FFFFFF" />
      
      {/* Head */}
      <Circle cx="50" cy="20" r="9" fill="#FFFFFF" />
      
      {/* Champion body */}
      <Path 
        d="M39 29 C37 31 36 36 36 43 L36 50 C36 52 38 55 43 55 L57 55 C62 55 64 52 64 50 L64 43 C64 36 63 31 61 29 Z" 
        fill="#FFFFFF"
      />
      
      {/* Champion shoulders */}
      <Ellipse cx="34" cy="33" rx="5" ry="4" fill="#FFFFFF" />
      <Ellipse cx="66" cy="33" rx="5" ry="4" fill="#FFFFFF" />
      
      {/* Champion arms */}
      <Path d="M34 33 Q20 45 15 56" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      <Path d="M66 33 Q80 26 88 18" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
      
      {/* Champion legs */}
      <Path d="M41 55 Q28 70 18 86" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      <Path d="M59 55 Q74 62 86 66" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      
      {/* Golden feet */}
      <Ellipse cx="16" cy="88" rx="6" ry="3" fill="url(#goldShine)" />
      <Ellipse cx="88" cy="68" rx="6" ry="3" fill="url(#goldShine)" />
    </G>
    
    {/* Sparkles */}
    <Circle cx="18" cy="22" r="2" fill="#FEF3C7" />
    <Circle cx="82" cy="32" r="1.5" fill="#FEF3C7" />
    <Circle cx="85" cy="50" r="2" fill="#FEF3C7" />
  </Svg>
);

// Maître - Animated aura, legendary status
const MaitreAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="maitreBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#B91C1C" />
      </LinearGradient>
      <LinearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="50%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#FCD34D" />
      </LinearGradient>
      <RadialGradient id="maitreGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FCD34D" stopOpacity="0.5" />
        <Stop offset="50%" stopColor="#EF4444" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#maitreBg)" />
    <Circle cx="50" cy="50" r="46" fill="url(#maitreGlow)" />
    
    {/* Fire aura lines */}
    <G opacity={0.9}>
      <Path d="M8 30 Q5 25 10 22" stroke="#FCD34D" strokeWidth="2" fill="none" />
      <Path d="M6 42 Q2 38 8 35" stroke="#F59E0B" strokeWidth="2" fill="none" />
      <Path d="M8 54 Q4 50 10 48" stroke="#EF4444" strokeWidth="2" fill="none" />
    </G>
    
    {/* Legendary runner */}
    <G transform="rotate(18, 50, 70)">
      {/* Fire crown */}
      <Path 
        d="M30 14 Q35 0 42 10 Q48 -2 50 8 Q52 -2 58 10 Q65 0 70 14" 
        fill="url(#fireGrad)"
      />
      
      {/* Majestic crown */}
      <Path 
        d="M34 14 L38 6 L50 12 L62 6 L66 14 Z" 
        fill="#FCD34D"
      />
      <Circle cx="42" cy="9" r="2" fill="#EF4444" />
      <Circle cx="50" cy="6" r="2.5" fill="#EF4444" />
      <Circle cx="58" cy="9" r="2" fill="#EF4444" />
      
      {/* Head */}
      <Circle cx="50" cy="22" r="9" fill="#FFFFFF" />
      
      {/* Legendary body */}
      <Path 
        d="M38 31 C36 33 35 38 35 45 L35 52 C35 54 37 57 42 57 L58 57 C63 57 65 54 65 52 L65 45 C65 38 64 33 62 31 Z" 
        fill="#FFFFFF"
      />
      
      {/* Powerful shoulders */}
      <Ellipse cx="33" cy="35" rx="6" ry="4" fill="#FFFFFF" />
      <Ellipse cx="67" cy="35" rx="6" ry="4" fill="#FFFFFF" />
      
      {/* Legendary arms */}
      <Path d="M33 35 Q18 48 12 60" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Path d="M67 35 Q82 25 92 15" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      
      {/* Fire hands */}
      <Circle cx="10" cy="62" r="5" fill="url(#fireGrad)" />
      <Circle cx="94" cy="13" r="5" fill="url(#fireGrad)" />
      
      {/* Legendary legs */}
      <Path d="M40 57 Q25 72 14 90" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
      <Path d="M60 57 Q76 64 90 68" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
      
      {/* Fire feet */}
      <Ellipse cx="12" cy="92" rx="7" ry="4" fill="url(#fireGrad)" />
      <Ellipse cx="92" cy="70" rx="7" ry="4" fill="url(#fireGrad)" />
    </G>
    
    {/* Fire particles */}
    <Circle cx="15" cy="18" r="2" fill="#FCD34D" />
    <Circle cx="85" cy="28" r="2.5" fill="#F59E0B" />
    <Circle cx="90" cy="48" r="2" fill="#EF4444" />
    <Circle cx="12" cy="70" r="1.5" fill="#FCD34D" />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  auraRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  auraSegment: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  auraSegment1: {
    top: 0,
    left: '50%',
    marginLeft: -4,
  },
  auraSegment2: {
    bottom: '25%',
    right: 0,
  },
  auraSegment3: {
    bottom: '25%',
    left: 0,
  },
});
