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
  Ellipse,
  Rect
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
            toValue: 1.1,
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
      {/* Glow for higher ranks */}
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

// ============================================
// DÉBUTANT - Posture droite, marche tranquille
// ============================================
const DebutantAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="debutantBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#4B5563" />
        <Stop offset="100%" stopColor="#374151" />
      </LinearGradient>
      <LinearGradient id="debutantBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#9CA3AF" />
        <Stop offset="100%" stopColor="#6B7280" />
      </LinearGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#debutantBg)" />
    
    {/* Runner - Standing/Walking pose */}
    <G>
      {/* Head */}
      <Circle cx="50" cy="22" r="8" fill="url(#debutantBody)" />
      
      {/* Neck */}
      <Rect x="47" y="29" width="6" height="5" fill="url(#debutantBody)" rx="2" />
      
      {/* Torso */}
      <Path 
        d="M42 34 L42 54 Q42 58 46 58 L54 58 Q58 58 58 54 L58 34 Q58 32 54 32 L46 32 Q42 32 42 34" 
        fill="url(#debutantBody)"
      />
      
      {/* Left arm - relaxed */}
      <Path 
        d="M42 36 Q38 42 36 52" 
        stroke="url(#debutantBody)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right arm - relaxed */}
      <Path 
        d="M58 36 Q62 42 64 52" 
        stroke="url(#debutantBody)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Left leg */}
      <Path 
        d="M46 58 Q44 68 42 80" 
        stroke="url(#debutantBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right leg */}
      <Path 
        d="M54 58 Q56 68 58 80" 
        stroke="url(#debutantBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Shoes */}
      <Ellipse cx="41" cy="82" rx="5" ry="3" fill="#4B5563" />
      <Ellipse cx="59" cy="82" rx="5" ry="3" fill="#4B5563" />
    </G>
  </Svg>
);

// ============================================
// JOGGER - Inclinaison avant, début de course
// ============================================
const JoggerAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="joggerBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#10B981" />
        <Stop offset="100%" stopColor="#059669" />
      </LinearGradient>
      <LinearGradient id="joggerBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#E5E7EB" />
      </LinearGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#joggerBg)" />
    
    {/* Runner - Light jog, slight lean */}
    <G transform="rotate(5, 50, 80)">
      {/* Head */}
      <Circle cx="50" cy="20" r="8" fill="url(#joggerBody)" />
      
      {/* Neck */}
      <Rect x="47" y="27" width="6" height="5" fill="url(#joggerBody)" rx="2" />
      
      {/* Torso - slight lean */}
      <Path 
        d="M41 32 L40 52 Q40 56 44 56 L56 56 Q60 56 60 52 L59 32 Q58 30 54 30 L46 30 Q42 30 41 32" 
        fill="url(#joggerBody)"
      />
      
      {/* Left arm - back swing */}
      <Path 
        d="M41 34 Q34 42 30 50" 
        stroke="url(#joggerBody)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right arm - forward swing */}
      <Path 
        d="M59 34 Q66 38 70 44" 
        stroke="url(#joggerBody)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Left leg - back */}
      <Path 
        d="M44 56 Q36 66 30 78" 
        stroke="url(#joggerBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right leg - forward */}
      <Path 
        d="M56 56 Q64 64 70 74" 
        stroke="url(#joggerBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Shoes */}
      <Ellipse cx="28" cy="80" rx="5" ry="3" fill="#10B981" />
      <Ellipse cx="72" cy="76" rx="5" ry="3" fill="#10B981" />
    </G>
  </Svg>
);

// ============================================
// COUREUR - Bras dynamiques, vraie course
// ============================================
const CoureurAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="coureurBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#3B82F6" />
        <Stop offset="100%" stopColor="#1D4ED8" />
      </LinearGradient>
      <LinearGradient id="coureurBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#E5E7EB" />
      </LinearGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#coureurBg)" />
    
    {/* Runner - Dynamic running pose */}
    <G transform="rotate(10, 50, 80)">
      {/* Head */}
      <Circle cx="50" cy="18" r="8" fill="url(#coureurBody)" />
      
      {/* Neck */}
      <Rect x="47" y="25" width="6" height="4" fill="url(#coureurBody)" rx="2" />
      
      {/* Torso - athletic */}
      <Path 
        d="M40 29 L38 50 Q38 54 43 54 L57 54 Q62 54 62 50 L60 29 Q59 27 54 27 L46 27 Q41 27 40 29" 
        fill="url(#coureurBody)"
      />
      
      {/* Shoulders slightly broader */}
      <Ellipse cx="38" cy="31" rx="3" ry="2" fill="url(#coureurBody)" />
      <Ellipse cx="62" cy="31" rx="3" ry="2" fill="url(#coureurBody)" />
      
      {/* Left arm - strong back swing */}
      <Path 
        d="M38 32 Q28 44 22 54" 
        stroke="url(#coureurBody)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right arm - powerful forward */}
      <Path 
        d="M62 32 Q72 30 78 34" 
        stroke="url(#coureurBody)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Left leg - extended back */}
      <Path 
        d="M43 54 Q30 66 20 82" 
        stroke="url(#coureurBody)" 
        strokeWidth="7" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right leg - driving forward */}
      <Path 
        d="M57 54 Q70 60 80 68" 
        stroke="url(#coureurBody)" 
        strokeWidth="7" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Shoes */}
      <Ellipse cx="18" cy="84" rx="6" ry="3" fill="#3B82F6" />
      <Ellipse cx="82" cy="70" rx="6" ry="3" fill="#3B82F6" />
    </G>
  </Svg>
);

// ============================================
// ATHLÈTE - Épaules larges, lignes de vitesse
// ============================================
const AthleteAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="athleteBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#8B5CF6" />
        <Stop offset="100%" stopColor="#6D28D9" />
      </LinearGradient>
      <LinearGradient id="athleteBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#E5E7EB" />
      </LinearGradient>
      <RadialGradient id="athleteGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="60%" stopColor="transparent" />
        <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0.3" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#athleteBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#athleteGlow)" />
    
    {/* Speed lines */}
    <G opacity={0.7}>
      <Line x1="14" y1="30" x2="6" y2="30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="40" x2="2" y2="40" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="14" y1="50" x2="4" y2="50" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="60" x2="8" y2="60" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </G>
    
    {/* Runner - Powerful sprint */}
    <G transform="rotate(12, 50, 80)">
      {/* Head */}
      <Circle cx="50" cy="16" r="8" fill="url(#athleteBody)" />
      
      {/* Neck - thicker */}
      <Rect x="46" y="23" width="8" height="5" fill="url(#athleteBody)" rx="2" />
      
      {/* Torso - more muscular */}
      <Path 
        d="M38 28 L36 50 Q36 54 42 54 L58 54 Q64 54 64 50 L62 28 Q61 26 54 26 L46 26 Q39 26 38 28" 
        fill="url(#athleteBody)"
      />
      
      {/* Broad shoulders */}
      <Ellipse cx="35" cy="30" rx="4" ry="3" fill="url(#athleteBody)" />
      <Ellipse cx="65" cy="30" rx="4" ry="3" fill="url(#athleteBody)" />
      
      {/* Left arm - powerful back swing */}
      <Path 
        d="M35 30 Q22 44 16 56" 
        stroke="url(#athleteBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right arm - explosive forward */}
      <Path 
        d="M65 30 Q78 24 86 26" 
        stroke="url(#athleteBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Left leg - powerful push */}
      <Path 
        d="M42 54 Q26 68 14 86" 
        stroke="url(#athleteBody)" 
        strokeWidth="8" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right leg - driving stride */}
      <Path 
        d="M58 54 Q74 58 88 64" 
        stroke="url(#athleteBody)" 
        strokeWidth="8" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Performance shoes */}
      <Ellipse cx="12" cy="88" rx="6" ry="3" fill="#8B5CF6" />
      <Ellipse cx="90" cy="66" rx="6" ry="3" fill="#8B5CF6" />
    </G>
  </Svg>
);

// ============================================
// CHAMPION - Glow doré, couronne subtile
// ============================================
const ChampionAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="championBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="100%" stopColor="#D97706" />
      </LinearGradient>
      <LinearGradient id="championBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#FEF3C7" />
      </LinearGradient>
      <LinearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FEF3C7" />
        <Stop offset="50%" stopColor="#FCD34D" />
        <Stop offset="100%" stopColor="#F59E0B" />
      </LinearGradient>
      <RadialGradient id="championGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="50%" stopColor="transparent" />
        <Stop offset="100%" stopColor="#FCD34D" stopOpacity="0.4" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#championBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#championGlow)" />
    
    {/* Speed lines - golden */}
    <G opacity={0.8}>
      <Line x1="12" y1="28" x2="4" y2="28" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />
      <Line x1="10" y1="38" x2="1" y2="38" stroke="#FEF3C7" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="12" y1="48" x2="3" y2="48" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Runner - Champion elite */}
    <G transform="rotate(14, 50, 80)">
      {/* Crown */}
      <G>
        <Path 
          d="M38 10 L42 2 L50 8 L58 2 L62 10 L58 12 L50 8 L42 12 Z" 
          fill="url(#goldShine)"
        />
        <Circle cx="42" cy="6" r="1.5" fill="#FFFFFF" />
        <Circle cx="50" cy="4" r="2" fill="#FFFFFF" />
        <Circle cx="58" cy="6" r="1.5" fill="#FFFFFF" />
      </G>
      
      {/* Head */}
      <Circle cx="50" cy="18" r="8" fill="url(#championBody)" />
      
      {/* Neck */}
      <Rect x="46" y="25" width="8" height="5" fill="url(#championBody)" rx="2" />
      
      {/* Elite torso */}
      <Path 
        d="M37 30 L34 52 Q34 56 41 56 L59 56 Q66 56 66 52 L63 30 Q62 28 54 28 L46 28 Q38 28 37 30" 
        fill="url(#championBody)"
      />
      
      {/* Champion shoulders */}
      <Ellipse cx="34" cy="32" rx="5" ry="3" fill="url(#championBody)" />
      <Ellipse cx="66" cy="32" rx="5" ry="3" fill="url(#championBody)" />
      
      {/* Left arm */}
      <Path 
        d="M34 32 Q18 48 12 60" 
        stroke="url(#championBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right arm */}
      <Path 
        d="M66 32 Q82 22 90 20" 
        stroke="url(#championBody)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Left leg */}
      <Path 
        d="M41 56 Q22 72 10 90" 
        stroke="url(#championBody)" 
        strokeWidth="8" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right leg */}
      <Path 
        d="M59 56 Q78 58 94 62" 
        stroke="url(#championBody)" 
        strokeWidth="8" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Golden shoes */}
      <Ellipse cx="8" cy="92" rx="6" ry="3" fill="url(#goldShine)" />
      <Ellipse cx="96" cy="64" rx="6" ry="3" fill="url(#goldShine)" />
    </G>
    
    {/* Sparkles */}
    <Circle cx="20" cy="18" r="2" fill="#FEF3C7" />
    <Circle cx="80" cy="24" r="2" fill="#FEF3C7" />
    <Circle cx="88" cy="44" r="1.5" fill="#FEF3C7" />
  </Svg>
);

// ============================================
// MAÎTRE - Aura légendaire, effets de feu
// ============================================
const MaitreAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="maitreBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#B91C1C" />
      </LinearGradient>
      <LinearGradient id="maitreBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#FEE2E2" />
      </LinearGradient>
      <LinearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="50%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#FCD34D" />
      </LinearGradient>
      <RadialGradient id="maitreAura" cx="50%" cy="50%" r="50%">
        <Stop offset="40%" stopColor="transparent" />
        <Stop offset="70%" stopColor="#F59E0B" stopOpacity="0.2" />
        <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.4" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#maitreBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#maitreAura)" />
    
    {/* Fire aura lines */}
    <G opacity={0.9}>
      <Path d="M10 26 Q6 22 12 18" stroke="#FCD34D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M8 38 Q3 34 10 30" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M10 50 Q4 46 12 42" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M12 62 Q6 58 14 54" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </G>
    
    {/* Runner - Legendary master */}
    <G transform="rotate(15, 50, 80)">
      {/* Fire crown aura */}
      <Path 
        d="M32 8 Q38 -4 44 6 Q48 -6 50 4 Q52 -6 56 6 Q62 -4 68 8" 
        fill="url(#fireGrad)"
        opacity={0.8}
      />
      
      {/* Majestic crown */}
      <G>
        <Path 
          d="M36 10 L40 0 L50 7 L60 0 L64 10 L60 12 L50 6 L40 12 Z" 
          fill="#FCD34D"
          stroke="#FFFFFF"
          strokeWidth="0.5"
        />
        <Circle cx="40" cy="5" r="2" fill="#EF4444" />
        <Circle cx="50" cy="2" r="2.5" fill="#EF4444" />
        <Circle cx="60" cy="5" r="2" fill="#EF4444" />
      </G>
      
      {/* Head */}
      <Circle cx="50" cy="18" r="8" fill="url(#maitreBody)" />
      
      {/* Neck */}
      <Rect x="45" y="25" width="10" height="5" fill="url(#maitreBody)" rx="2" />
      
      {/* Legendary torso */}
      <Path 
        d="M35 30 L32 54 Q32 58 40 58 L60 58 Q68 58 68 54 L65 30 Q64 28 54 28 L46 28 Q36 28 35 30" 
        fill="url(#maitreBody)"
      />
      
      {/* Powerful shoulders */}
      <Ellipse cx="32" cy="32" rx="6" ry="4" fill="url(#maitreBody)" />
      <Ellipse cx="68" cy="32" rx="6" ry="4" fill="url(#maitreBody)" />
      
      {/* Left arm with fire */}
      <Path 
        d="M32 32 Q14 50 6 64" 
        stroke="url(#maitreBody)" 
        strokeWidth="7" 
        strokeLinecap="round" 
        fill="none"
      />
      <Circle cx="4" cy="66" r="5" fill="url(#fireGrad)" />
      
      {/* Right arm with fire */}
      <Path 
        d="M68 32 Q86 18 96 14" 
        stroke="url(#maitreBody)" 
        strokeWidth="7" 
        strokeLinecap="round" 
        fill="none"
      />
      <Circle cx="98" cy="12" r="5" fill="url(#fireGrad)" />
      
      {/* Left leg */}
      <Path 
        d="M40 58 Q18 76 4 96" 
        stroke="url(#maitreBody)" 
        strokeWidth="9" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Right leg */}
      <Path 
        d="M60 58 Q82 58 100 60" 
        stroke="url(#maitreBody)" 
        strokeWidth="9" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Fire shoes */}
      <Ellipse cx="2" cy="98" rx="7" ry="4" fill="url(#fireGrad)" />
      <Ellipse cx="102" cy="62" rx="7" ry="4" fill="url(#fireGrad)" />
    </G>
    
    {/* Fire particles */}
    <Circle cx="16" cy="14" r="2.5" fill="#FCD34D" />
    <Circle cx="84" cy="20" r="2" fill="#F59E0B" />
    <Circle cx="92" cy="38" r="2.5" fill="#EF4444" />
    <Circle cx="88" cy="54" r="2" fill="#FCD34D" />
    <Circle cx="8" cy="74" r="2" fill="#F59E0B" />
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
