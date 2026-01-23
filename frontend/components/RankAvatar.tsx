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
  Ellipse
} from 'react-native-svg';

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
            toValue: 1.12,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 1000,
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

  const renderAvatar = () => {
    switch (rankId) {
      case 'debutant': return <DebutantAvatar size={size} />;
      case 'jogger': return <JoggerAvatar size={size} />;
      case 'coureur': return <CoureurAvatar size={size} />;
      case 'athlete': return <AthleteAvatar size={size} />;
      case 'champion': return <ChampionAvatar size={size} />;
      case 'maitre': return <MaitreAvatar size={size} />;
      default: return <DebutantAvatar size={size} />;
    }
  };

  const getGlowColor = () => {
    switch (rankId) {
      case 'athlete': return '#9932CC';
      case 'champion': return '#FFD700';
      case 'maitre': return '#FF4500';
      default: return 'transparent';
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {showGlow && ['athlete', 'champion', 'maitre'].includes(rankId) && (
        <Animated.View 
          style={[
            styles.glow, 
            { 
              backgroundColor: getGlowColor(),
              width: size * 1.4,
              height: size * 1.4,
              borderRadius: size * 0.7,
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

// Runner silhouette - dynamic running pose
const RunnerSilhouette = ({ color }: { color: string }) => (
  <G>
    {/* Head */}
    <Circle cx="52" cy="28" r="7" fill={color} />
    
    {/* Torso */}
    <Path 
      d="M48 35 C46 40 45 48 46 52 L56 52 C57 48 56 40 54 35 Z" 
      fill={color}
    />
    
    {/* Left arm - back swing */}
    <Path 
      d="M46 38 Q36 46 30 52" 
      stroke={color} 
      strokeWidth="5" 
      strokeLinecap="round" 
      fill="none"
    />
    
    {/* Right arm - forward */}
    <Path 
      d="M56 38 Q66 34 72 32" 
      stroke={color} 
      strokeWidth="5" 
      strokeLinecap="round" 
      fill="none"
    />
    
    {/* Left leg - back */}
    <Path 
      d="M48 52 Q38 62 28 76" 
      stroke={color} 
      strokeWidth="6" 
      strokeLinecap="round" 
      fill="none"
    />
    
    {/* Right leg - forward */}
    <Path 
      d="M54 52 Q64 58 74 66" 
      stroke={color} 
      strokeWidth="6" 
      strokeLinecap="round" 
      fill="none"
    />
  </G>
);

// ============================================
// DÉBUTANT - Dark blue bg, light blue runner
// ============================================
const DebutantAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="debutantBg" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#0A1628" />
        <Stop offset="100%" stopColor="#050E29" />
      </RadialGradient>
    </Defs>
    
    {/* Dark blue background */}
    <Circle cx="50" cy="50" r="46" fill="url(#debutantBg)" />
    
    {/* Light blue runner */}
    <RunnerSilhouette color="#66C7FF" />
  </Svg>
);

// ============================================
// JOGGER - Green glow, lime runner, speed lines
// ============================================
const JoggerAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="joggerBg" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#00FF7F" stopOpacity="0.3" />
        <Stop offset="40%" stopColor="#008080" />
        <Stop offset="100%" stopColor="#004040" />
      </RadialGradient>
      <RadialGradient id="joggerGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#7FFFD4" stopOpacity="0.6" />
        <Stop offset="100%" stopColor="transparent" />
      </RadialGradient>
    </Defs>
    
    {/* Green background with glow */}
    <Circle cx="50" cy="50" r="46" fill="url(#joggerBg)" />
    <Circle cx="50" cy="50" r="40" fill="url(#joggerGlow)" />
    
    {/* Speed lines - green */}
    <G opacity={0.8}>
      <Path d="M22 38 L10 38" stroke="#90EE90" strokeWidth="2" strokeLinecap="round" />
      <Path d="M20 46 L6 46" stroke="#90EE90" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M22 54 L8 54" stroke="#90EE90" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Lime green runner */}
    <RunnerSilhouette color="#90EE90" />
    
    {/* Yellow-green sparkles */}
    <Circle cx="78" cy="32" r="2" fill="#DAFF33" />
    <Circle cx="82" cy="44" r="1.5" fill="#DAFF33" />
    <Circle cx="76" cy="56" r="1.5" fill="#DAFF33" />
  </Svg>
);

// ============================================
// COUREUR - Cyan glow, bright cyan runner
// ============================================
const CoureurAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="coureurBg" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#00FFFF" stopOpacity="0.4" />
        <Stop offset="50%" stopColor="#008B8B" />
        <Stop offset="100%" stopColor="#000080" />
      </RadialGradient>
      <RadialGradient id="coureurGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#00FFFF" stopOpacity="0.7" />
        <Stop offset="100%" stopColor="transparent" />
      </RadialGradient>
    </Defs>
    
    {/* Cyan background with strong glow */}
    <Circle cx="50" cy="50" r="46" fill="url(#coureurBg)" />
    <Circle cx="50" cy="50" r="38" fill="url(#coureurGlow)" />
    
    {/* Speed lines - cyan and white */}
    <G opacity={0.9}>
      <Path d="M24 34 L8 34" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Path d="M22 42 L4 42" stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M24 50 L6 50" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M22 58 L8 58" stroke="#00FFFF" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Bright cyan runner */}
    <RunnerSilhouette color="#00FFFF" />
    
    {/* White and cyan sparkles */}
    <Circle cx="80" cy="28" r="2.5" fill="#FFFFFF" />
    <Circle cx="84" cy="42" r="2" fill="#E0FFFF" />
    <Circle cx="78" cy="54" r="2" fill="#FFFFFF" />
    <Circle cx="82" cy="66" r="1.5" fill="#E0FFFF" />
  </Svg>
);

// ============================================
// ATHLÈTE - Purple/pink glow, gold crown
// ============================================
const AthleteAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="athleteBg" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FF00FF" stopOpacity="0.5" />
        <Stop offset="40%" stopColor="#800080" />
        <Stop offset="100%" stopColor="#4B0082" />
      </RadialGradient>
      <RadialGradient id="athleteGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FF69B4" stopOpacity="0.6" />
        <Stop offset="100%" stopColor="transparent" />
      </RadialGradient>
    </Defs>
    
    {/* Purple background with pink glow */}
    <Circle cx="50" cy="50" r="46" fill="url(#athleteBg)" />
    <Circle cx="50" cy="50" r="38" fill="url(#athleteGlow)" />
    
    {/* Speed lines - pink and purple */}
    <G opacity={0.85}>
      <Path d="M26 30 L8 30" stroke="#FF69B4" strokeWidth="2" strokeLinecap="round" />
      <Path d="M24 38 L4 38" stroke="#FF00FF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M26 46 L6 46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M24 54 L8 54" stroke="#FF69B4" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M26 62 L10 62" stroke="#FF00FF" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Gold crown */}
    <Path d="M42 20 L46 12 L52 18 L58 12 L62 20 Z" fill="#FFD700" />
    <Circle cx="52" cy="15" r="2" fill="#FFFFFF" />
    
    {/* Purple/magenta runner */}
    <RunnerSilhouette color="#DA70D6" />
    
    {/* Pink and white sparkles */}
    <Circle cx="82" cy="24" r="3" fill="#FFFFFF" />
    <Circle cx="86" cy="38" r="2.5" fill="#FFB6C1" />
    <Circle cx="80" cy="52" r="2.5" fill="#FFFFFF" />
    <Circle cx="84" cy="66" r="2" fill="#FFB6C1" />
    <Circle cx="18" cy="22" r="2" fill="#FFFFFF" />
    <Circle cx="14" cy="70" r="2" fill="#FFB6C1" />
  </Svg>
);

// ============================================
// CHAMPION - Golden/orange fire, elaborate crown
// ============================================
const ChampionAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="championBg" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FFFF00" stopOpacity="0.6" />
        <Stop offset="40%" stopColor="#FFD700" />
        <Stop offset="70%" stopColor="#FF8C00" />
        <Stop offset="100%" stopColor="#FF4500" />
      </RadialGradient>
      <RadialGradient id="championGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#FFFF00" stopOpacity="0.8" />
        <Stop offset="100%" stopColor="transparent" />
      </RadialGradient>
      <LinearGradient id="crownGold" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#FFD700" />
        <Stop offset="100%" stopColor="#FFFF00" />
      </LinearGradient>
    </Defs>
    
    {/* Golden/orange background with intense glow */}
    <Circle cx="50" cy="50" r="46" fill="url(#championBg)" />
    <Circle cx="50" cy="50" r="36" fill="url(#championGlow)" />
    
    {/* Fire-like speed lines - yellow and orange */}
    <G opacity={0.9}>
      <Path d="M26 26 Q18 24 8 26" stroke="#FFFF00" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Path d="M24 34 Q14 32 4 36" stroke="#FFA500" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M26 44 Q16 42 6 46" stroke="#FFFF00" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M24 54 Q14 52 6 56" stroke="#FFA500" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Path d="M26 64 Q18 62 10 66" stroke="#FFFF00" strokeWidth="2" strokeLinecap="round" fill="none" />
    </G>
    
    {/* Elaborate gold crown with points */}
    <G>
      <Path d="M38 18 L42 8 L48 14 L52 4 L56 14 L62 8 L66 18 Z" fill="url(#crownGold)" />
      <Circle cx="42" cy="12" r="2" fill="#FFFFFF" />
      <Circle cx="52" cy="8" r="2.5" fill="#FFFFFF" />
      <Circle cx="62" cy="12" r="2" fill="#FFFFFF" />
    </G>
    
    {/* Golden yellow runner */}
    <RunnerSilhouette color="#FFFF00" />
    
    {/* Yellow and orange sparkles/particles */}
    <Circle cx="84" cy="20" r="3" fill="#FFFF00" />
    <Circle cx="88" cy="36" r="2.5" fill="#FFA500" />
    <Circle cx="82" cy="50" r="3" fill="#FFFF00" />
    <Circle cx="86" cy="64" r="2.5" fill="#FFA500" />
    <Circle cx="80" cy="76" r="2" fill="#FFFF00" />
    <Circle cx="16" cy="18" r="2.5" fill="#FFA500" />
    <Circle cx="12" cy="74" r="2" fill="#FFFF00" />
  </Svg>
);

// ============================================
// MAÎTRE - Intense fire, no crown, flame background
// ============================================
const MaitreAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="maitreBg" cx="50%" cy="70%" r="60%">
        <Stop offset="0%" stopColor="#FFFF00" stopOpacity="0.8" />
        <Stop offset="30%" stopColor="#FFA500" />
        <Stop offset="60%" stopColor="#FF4500" />
        <Stop offset="100%" stopColor="#8B0000" />
      </RadialGradient>
      <LinearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#FF0000" />
        <Stop offset="50%" stopColor="#FFA500" />
        <Stop offset="100%" stopColor="#FFFF00" />
      </LinearGradient>
    </Defs>
    
    {/* Fire background */}
    <Circle cx="50" cy="50" r="46" fill="url(#maitreBg)" />
    
    {/* Flame shapes around the edge */}
    <G opacity={0.9}>
      {/* Left flames */}
      <Path d="M8 70 Q4 60 10 50 Q6 42 12 32 Q8 24 16 18" stroke="#FFFF00" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M14 74 Q10 64 16 54 Q12 46 18 38 Q14 30 20 22" stroke="#FFA500" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      
      {/* Top flames */}
      <Path d="M30 12 Q36 4 42 10 Q48 2 52 8 Q58 0 64 8 Q70 2 74 12" fill="url(#flameGrad)" />
      
      {/* Right flames */}
      <Path d="M92 70 Q96 60 90 50 Q94 42 88 32 Q92 24 84 18" stroke="#FFFF00" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M86 74 Q90 64 84 54 Q88 46 82 38 Q86 30 80 22" stroke="#FFA500" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </G>
    
    {/* Orange-red runner (no crown - mastery beyond titles) */}
    <G>
      {/* Head */}
      <Circle cx="52" cy="28" r="7" fill="#FF4500" />
      
      {/* Torso */}
      <Path d="M48 35 C46 40 45 48 46 52 L56 52 C57 48 56 40 54 35 Z" fill="#FF4500" />
      
      {/* Left arm */}
      <Path d="M46 38 Q36 46 30 52" stroke="#FF4500" strokeWidth="5" strokeLinecap="round" fill="none" />
      
      {/* Right arm */}
      <Path d="M56 38 Q66 34 72 32" stroke="#FF4500" strokeWidth="5" strokeLinecap="round" fill="none" />
      
      {/* Left leg */}
      <Path d="M48 52 Q38 62 28 76" stroke="#FF4500" strokeWidth="6" strokeLinecap="round" fill="none" />
      
      {/* Right leg */}
      <Path d="M54 52 Q64 58 74 66" stroke="#FF4500" strokeWidth="6" strokeLinecap="round" fill="none" />
    </G>
    
    {/* Fire embers/sparkles */}
    <Circle cx="86" cy="24" r="3" fill="#FFFF00" />
    <Circle cx="90" cy="40" r="2.5" fill="#FFA500" />
    <Circle cx="84" cy="56" r="3" fill="#FF4500" />
    <Circle cx="88" cy="72" r="2.5" fill="#FFFF00" />
    <Circle cx="14" cy="26" r="2.5" fill="#FFA500" />
    <Circle cx="10" cy="44" r="3" fill="#FFFF00" />
    <Circle cx="16" cy="62" r="2.5" fill="#FF4500" />
    <Circle cx="12" cy="78" r="2" fill="#FFA500" />
    {/* Extra embers */}
    <Circle cx="78" cy="14" r="2" fill="#FFFF00" />
    <Circle cx="22" cy="16" r="2" fill="#FFA500" />
    <Circle cx="76" cy="82" r="2" fill="#FF4500" />
    <Circle cx="24" cy="84" r="2" fill="#FFFF00" />
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
