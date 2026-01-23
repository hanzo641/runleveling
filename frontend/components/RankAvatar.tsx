import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { 
  Path, 
  Circle, 
  Ellipse, 
  G, 
  Defs, 
  LinearGradient, 
  Stop, 
  RadialGradient,
  Rect
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface RankAvatarProps {
  rankId: string;
  size?: number;
  showGlow?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export default function RankAvatar({ rankId, size = 80, showGlow = true }: RankAvatarProps) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (showGlow && ['champion', 'maitre'].includes(rankId)) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500 }),
          withTiming(0.4, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [rankId, showGlow]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

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

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {showGlow && ['athlete', 'champion', 'maitre'].includes(rankId) && (
        <AnimatedView 
          style={[
            styles.glow, 
            { 
              backgroundColor: getGlowColor(),
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: size * 0.65,
            },
            glowStyle
          ]} 
        />
      )}
      {renderAvatar()}
    </View>
  );
}

// Débutant - Simple gray runner silhouette
const DebutantAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="debutantBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#4B5563" />
        <Stop offset="100%" stopColor="#374151" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#debutantBg)" />
    {/* Simple runner silhouette */}
    <G fill="#9CA3AF">
      {/* Head */}
      <Circle cx="50" cy="28" r="10" />
      {/* Body */}
      <Path d="M50 38 L50 60 M50 45 L35 55 M50 45 L65 55" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Legs running pose */}
      <Path d="M50 60 L40 80 M50 60 L62 75" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" fill="none" />
    </G>
  </Svg>
);

// Jogger - Green runner with basic gear
const JoggerAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="joggerBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#10B981" />
        <Stop offset="100%" stopColor="#059669" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#joggerBg)" />
    {/* Runner with t-shirt */}
    <G>
      {/* Head */}
      <Circle cx="50" cy="26" r="11" fill="#FCD34D" />
      {/* Hair */}
      <Path d="M40 22 Q50 15 60 22" stroke="#92400E" strokeWidth="3" fill="none" />
      {/* T-shirt */}
      <Path d="M38 38 L38 55 L62 55 L62 38 Q50 42 38 38" fill="#FFFFFF" />
      {/* Arms */}
      <Path d="M38 40 L28 52" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      <Path d="M62 40 L72 48" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      {/* Shorts */}
      <Rect x="40" y="55" width="20" height="12" rx="2" fill="#1F2937" />
      {/* Legs */}
      <Path d="M43 67 L38 82" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      <Path d="M57 67 L65 78" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      {/* Shoes */}
      <Ellipse cx="36" cy="84" rx="6" ry="3" fill="#10B981" />
      <Ellipse cx="67" cy="80" rx="6" ry="3" fill="#10B981" />
    </G>
  </Svg>
);

// Coureur - Blue runner with medal
const CoureurAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="coureurBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#3B82F6" />
        <Stop offset="100%" stopColor="#1D4ED8" />
      </LinearGradient>
      <LinearGradient id="medalGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FCD34D" />
        <Stop offset="100%" stopColor="#F59E0B" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#coureurBg)" />
    {/* Athletic runner */}
    <G>
      {/* Head */}
      <Circle cx="50" cy="24" r="11" fill="#FCD34D" />
      {/* Headband */}
      <Path d="M39 22 L61 22" stroke="#EF4444" strokeWidth="3" />
      {/* Tank top */}
      <Path d="M40 35 L40 52 L60 52 L60 35 Q50 40 40 35" fill="#FFFFFF" />
      {/* Medal */}
      <Circle cx="50" cy="48" r="6" fill="url(#medalGold)" />
      <Path d="M47 35 L50 42 L53 35" stroke="#F59E0B" strokeWidth="2" fill="none" />
      {/* Arms (running pose) */}
      <Path d="M40 38 L25 48" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      <Path d="M60 38 L75 45" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      {/* Shorts */}
      <Rect x="42" y="52" width="16" height="10" rx="2" fill="#1F2937" />
      {/* Dynamic legs */}
      <Path d="M44 62 L32 80" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      <Path d="M56 62 L70 75" stroke="#FCD34D" strokeWidth="5" strokeLinecap="round" />
      {/* Shoes */}
      <Ellipse cx="30" cy="82" rx="6" ry="3" fill="#3B82F6" />
      <Ellipse cx="72" cy="77" rx="6" ry="3" fill="#3B82F6" />
    </G>
  </Svg>
);

// Athlète - Purple runner with muscles and aura
const AthleteAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="athleteBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#8B5CF6" />
        <Stop offset="100%" stopColor="#6D28D9" />
      </LinearGradient>
      <RadialGradient id="athleteAura" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#athleteBg)" />
    {/* Aura effect */}
    <Circle cx="50" cy="50" r="45" fill="url(#athleteAura)" />
    {/* Muscular runner */}
    <G>
      {/* Head */}
      <Circle cx="50" cy="22" r="11" fill="#FCD34D" />
      {/* Determined expression */}
      <Path d="M46 20 L48 22" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
      <Path d="M52 20 L54 22" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
      {/* Compression shirt */}
      <Path d="M38 33 L38 50 L62 50 L62 33 Q50 38 38 33" fill="#1F2937" />
      {/* Muscular arms */}
      <Path d="M38 36 L22 45" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" />
      <Path d="M62 36 L78 42" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" />
      {/* Number */}
      <G fill="#FFFFFF">
        <Path d="M48 40 L48 48 M48 40 L52 40 M48 44 L51 44 M48 48 L52 48" stroke="#FFFFFF" strokeWidth="1.5" />
      </G>
      {/* Shorts */}
      <Rect x="40" y="50" width="20" height="10" rx="2" fill="#4C1D95" />
      {/* Powerful legs */}
      <Path d="M43 60 L28 78" stroke="#FCD34D" strokeWidth="6" strokeLinecap="round" />
      <Path d="M57 60 L72 72" stroke="#FCD34D" strokeWidth="6" strokeLinecap="round" />
      {/* Pro shoes */}
      <Ellipse cx="26" cy="80" rx="7" ry="4" fill="#8B5CF6" />
      <Ellipse cx="74" cy="74" rx="7" ry="4" fill="#8B5CF6" />
      {/* Speed lines */}
      <Path d="M15 40 L8 40" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
      <Path d="M15 50 L5 50" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
      <Path d="M15 60 L8 60" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
    </G>
  </Svg>
);

// Champion - Gold runner with crown
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
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#championBg)" />
    {/* Champion runner */}
    <G>
      {/* Crown */}
      <Path d="M35 18 L38 10 L44 16 L50 6 L56 16 L62 10 L65 18 Z" fill="url(#goldShine)" />
      <Circle cx="50" cy="10" r="3" fill="#EF4444" />
      {/* Head */}
      <Circle cx="50" cy="26" r="11" fill="#FCD34D" />
      {/* Confident smile */}
      <Path d="M45 28 Q50 32 55 28" stroke="#92400E" strokeWidth="2" fill="none" />
      {/* Champion jersey */}
      <Path d="M36 38 L36 52 L64 52 L64 38 Q50 44 36 38" fill="url(#goldShine)" />
      {/* Trophy emblem */}
      <Path d="M47 43 L47 48 L53 48 L53 43 L55 43 L55 41 L45 41 L45 43 Z" fill="#92400E" />
      {/* Strong arms */}
      <Path d="M36 40 L20 50" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" />
      <Path d="M64 40 L80 46" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" />
      {/* Gold shorts */}
      <Rect x="40" y="52" width="20" height="10" rx="2" fill="#92400E" />
      {/* Champion legs */}
      <Path d="M43 62 L26 80" stroke="#FCD34D" strokeWidth="6" strokeLinecap="round" />
      <Path d="M57 62 L74 74" stroke="#FCD34D" strokeWidth="6" strokeLinecap="round" />
      {/* Gold shoes */}
      <Ellipse cx="24" cy="82" rx="7" ry="4" fill="url(#goldShine)" />
      <Ellipse cx="76" cy="76" rx="7" ry="4" fill="url(#goldShine)" />
      {/* Sparkles */}
      <Path d="M20 25 L22 30 L24 25 L22 20 Z" fill="#FEF3C7" />
      <Path d="M78 35 L80 40 L82 35 L80 30 Z" fill="#FEF3C7" />
      <Path d="M85 55 L87 58 L89 55 L87 52 Z" fill="#FEF3C7" />
    </G>
  </Svg>
);

// Maître - Legendary runner with epic fire effects
const MaitreAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="maitreBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#B91C1C" />
      </LinearGradient>
      <LinearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="50%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#FCD34D" />
      </LinearGradient>
      <RadialGradient id="maitreAura" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FCD34D" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#maitreBg)" />
    {/* Fire aura */}
    <Circle cx="50" cy="50" r="45" fill="url(#maitreAura)" />
    {/* Legendary runner */}
    <G>
      {/* Fire crown */}
      <Path d="M30 20 Q35 5 40 15 Q45 0 50 12 Q55 0 60 15 Q65 5 70 20" 
            fill="url(#fireGradient)" />
      {/* Majestic crown */}
      <Path d="M35 22 L38 14 L44 18 L50 10 L56 18 L62 14 L65 22 Z" fill="#FCD34D" />
      <Circle cx="44" cy="16" r="2" fill="#EF4444" />
      <Circle cx="50" cy="12" r="3" fill="#EF4444" />
      <Circle cx="56" cy="16" r="2" fill="#EF4444" />
      {/* Head with glow */}
      <Circle cx="50" cy="28" r="11" fill="#FCD34D" />
      {/* Intense eyes */}
      <Circle cx="46" cy="27" r="2" fill="#1F2937" />
      <Circle cx="54" cy="27" r="2" fill="#1F2937" />
      <Path d="M46 31 L54 31" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
      {/* Legendary armor */}
      <Path d="M34 40 L34 54 L66 54 L66 40 Q50 48 34 40" fill="#1F2937" />
      {/* Fire emblem on chest */}
      <Path d="M46 44 Q50 38 54 44 Q52 48 50 46 Q48 48 46 44" fill="url(#fireGradient)" />
      {/* Powerful arms */}
      <Path d="M34 42 L18 52" stroke="#FCD34D" strokeWidth="8" strokeLinecap="round" />
      <Path d="M66 42 L82 48" stroke="#FCD34D" strokeWidth="8" strokeLinecap="round" />
      {/* Fire gauntlets */}
      <Circle cx="16" cy="54" r="5" fill="url(#fireGradient)" />
      <Circle cx="84" cy="50" r="5" fill="url(#fireGradient)" />
      {/* Legendary shorts */}
      <Rect x="38" y="54" width="24" height="10" rx="2" fill="#7F1D1D" />
      {/* Powerful legs */}
      <Path d="M42 64 L24 82" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" />
      <Path d="M58 64 L76 76" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" />
      {/* Fire shoes */}
      <Ellipse cx="22" cy="84" rx="8" ry="5" fill="url(#fireGradient)" />
      <Ellipse cx="78" cy="78" rx="8" ry="5" fill="url(#fireGradient)" />
      {/* Fire trail */}
      <Path d="M10 65 Q8 60 12 58 Q8 55 14 52" stroke="#F59E0B" strokeWidth="2" fill="none" />
      <Path d="M8 75 Q5 70 10 68" stroke="#EF4444" strokeWidth="2" fill="none" />
    </G>
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
});
