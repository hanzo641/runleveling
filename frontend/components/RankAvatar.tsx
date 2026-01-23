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
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (showGlow && ['athlete', 'champion', 'maitre'].includes(rankId)) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.15,
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
            toValue: 1,
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
      case 'athlete': return '#A855F7';
      case 'champion': return '#F59E0B';
      case 'maitre': return '#EF4444';
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
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size * 0.75,
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

// Runner silhouette path - dynamic sprint pose
const RunnerSilhouette = ({ color, scale = 1 }: { color: string; scale?: number }) => (
  <G transform={`scale(${scale}) translate(${(1-scale) * 50}, ${(1-scale) * 50})`}>
    {/* Head */}
    <Circle cx="52" cy="22" r="8" fill={color} />
    
    {/* Torso */}
    <Path 
      d="M48 30 Q46 35 44 48 L42 50 Q44 52 50 52 L56 52 Q60 52 58 50 L54 48 Q52 35 52 30 Z" 
      fill={color}
    />
    
    {/* Left arm - back */}
    <Path 
      d="M44 34 Q32 44 26 50" 
      stroke={color} 
      strokeWidth="6" 
      strokeLinecap="round" 
      fill="none"
    />
    
    {/* Right arm - forward */}
    <Path 
      d="M54 34 Q66 30 74 28" 
      stroke={color} 
      strokeWidth="6" 
      strokeLinecap="round" 
      fill="none"
    />
    
    {/* Left leg - extended back */}
    <Path 
      d="M46 52 Q32 64 20 80" 
      stroke={color} 
      strokeWidth="7" 
      strokeLinecap="round" 
      fill="none"
    />
    
    {/* Right leg - forward drive */}
    <Path 
      d="M54 52 Q66 58 78 66" 
      stroke={color} 
      strokeWidth="7" 
      strokeLinecap="round" 
      fill="none"
    />
  </G>
);

// Speed lines component
const SpeedLines = ({ color, opacity = 0.6, count = 3 }: { color: string; opacity?: number; count?: number }) => (
  <G opacity={opacity}>
    {count >= 1 && <Line x1="18" y1="32" x2="8" y2="32" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
    {count >= 2 && <Line x1="16" y1="42" x2="4" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round" />}
    {count >= 3 && <Line x1="18" y1="52" x2="6" y2="52" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
    {count >= 4 && <Line x1="20" y1="62" x2="10" y2="62" stroke={color} strokeWidth="2" strokeLinecap="round" />}
  </G>
);

// Sparkles/particles component
const Sparkles = ({ color, positions }: { color: string; positions: Array<{x: number; y: number; size: number}> }) => (
  <G>
    {positions.map((pos, i) => (
      <Circle key={i} cx={pos.x} cy={pos.y} r={pos.size} fill={color} />
    ))}
  </G>
);

// ============================================
// DÉBUTANT - Bleu simple, silhouette basique
// ============================================
const DebutantAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="debutantBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#3B82F6" />
        <Stop offset="100%" stopColor="#1D4ED8" />
      </LinearGradient>
    </Defs>
    
    {/* Background circle */}
    <Circle cx="50" cy="50" r="46" fill="url(#debutantBg)" />
    
    {/* Simple runner */}
    <G>
      <Circle cx="50" cy="26" r="7" fill="#93C5FD" />
      <Path d="M46 33 L46 50 L54 50 L54 33 Z" fill="#93C5FD" />
      <Path d="M46 36 L40 48" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />
      <Path d="M54 36 L60 48" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />
      <Path d="M48 50 L44 72" stroke="#93C5FD" strokeWidth="6" strokeLinecap="round" />
      <Path d="M52 50 L56 72" stroke="#93C5FD" strokeWidth="6" strokeLinecap="round" />
    </G>
  </Svg>
);

// ============================================
// JOGGER - Vert avec jaune, début dynamique
// ============================================
const JoggerAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="joggerBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#22C55E" />
        <Stop offset="100%" stopColor="#16A34A" />
      </LinearGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#joggerBg)" />
    
    {/* Speed lines */}
    <SpeedLines color="#FDE047" opacity={0.7} count={2} />
    
    {/* Runner - yellow/gold */}
    <G transform="rotate(8, 50, 50)">
      <Circle cx="52" cy="24" r="7" fill="#FDE047" />
      <Path d="M48 31 Q46 38 44 48 L54 48 Q52 38 52 31 Z" fill="#FDE047" />
      <Path d="M44 34 Q34 44 28 52" stroke="#FDE047" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M54 34 Q64 32 70 30" stroke="#FDE047" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M46 48 Q36 60 26 74" stroke="#FDE047" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d="M54 48 Q64 54 74 62" stroke="#FDE047" strokeWidth="6" strokeLinecap="round" fill="none" />
    </G>
    
    {/* Small sparkles */}
    <Sparkles color="#FEF3C7" positions={[
      {x: 82, y: 28, size: 2},
      {x: 78, y: 42, size: 1.5},
    ]} />
  </Svg>
);

// ============================================
// COUREUR - Cyan avec bleu, plus dynamique
// ============================================
const CoureurAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="coureurBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#06B6D4" />
        <Stop offset="100%" stopColor="#0891B2" />
      </LinearGradient>
      <RadialGradient id="coureurGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="70%" stopColor="transparent" />
        <Stop offset="100%" stopColor="#67E8F9" stopOpacity="0.3" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#coureurBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#coureurGlow)" />
    
    {/* Speed lines */}
    <SpeedLines color="#A5F3FC" opacity={0.8} count={3} />
    
    {/* Runner - bright blue */}
    <G transform="rotate(12, 50, 50)">
      <Circle cx="52" cy="22" r="8" fill="#38BDF8" />
      <Path d="M46 30 Q44 38 42 50 L56 50 Q54 38 54 30 Z" fill="#38BDF8" />
      <Path d="M42 34 Q30 46 22 56" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d="M56 34 Q68 28 78 24" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d="M44 50 Q30 64 18 80" stroke="#38BDF8" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Path d="M56 50 Q68 56 82 64" stroke="#38BDF8" strokeWidth="7" strokeLinecap="round" fill="none" />
    </G>
    
    {/* Sparkles */}
    <Sparkles color="#E0F2FE" positions={[
      {x: 84, y: 24, size: 2.5},
      {x: 80, y: 40, size: 2},
      {x: 86, y: 54, size: 1.5},
    ]} />
  </Svg>
);

// ============================================
// ATHLÈTE - Violet avec couronne, puissant
// ============================================
const AthleteAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="athleteBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#A855F7" />
        <Stop offset="100%" stopColor="#7C3AED" />
      </LinearGradient>
      <RadialGradient id="athleteGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="60%" stopColor="transparent" />
        <Stop offset="100%" stopColor="#E879F9" stopOpacity="0.4" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#athleteBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#athleteGlow)" />
    
    {/* Speed lines - pink */}
    <G opacity={0.8}>
      <Line x1="16" y1="30" x2="6" y2="30" stroke="#F0ABFC" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="14" y1="40" x2="2" y2="40" stroke="#F0ABFC" strokeWidth="3" strokeLinecap="round" />
      <Line x1="16" y1="50" x2="4" y2="50" stroke="#F0ABFC" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="18" y1="60" x2="8" y2="60" stroke="#F0ABFC" strokeWidth="2" strokeLinecap="round" />
    </G>
    
    {/* Runner - purple/magenta */}
    <G transform="rotate(14, 50, 50)">
      {/* Small crown */}
      <Path d="M44 12 L47 6 L52 10 L57 6 L60 12 Z" fill="#FDE047" />
      
      <Circle cx="52" cy="20" r="8" fill="#E879F9" />
      <Path d="M44 28 Q42 36 40 50 L58 50 Q56 36 56 28 Z" fill="#E879F9" />
      <Path d="M40 32 Q26 46 18 58" stroke="#E879F9" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d="M58 32 Q72 24 82 18" stroke="#E879F9" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d="M42 50 Q26 66 12 84" stroke="#E879F9" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Path d="M58 50 Q72 56 88 62" stroke="#E879F9" strokeWidth="7" strokeLinecap="round" fill="none" />
    </G>
    
    {/* Sparkles */}
    <Sparkles color="#FAE8FF" positions={[
      {x: 86, y: 20, size: 3},
      {x: 82, y: 38, size: 2.5},
      {x: 88, y: 52, size: 2},
      {x: 20, y: 18, size: 2},
    ]} />
  </Svg>
);

// ============================================
// CHAMPION - Orange/Or avec flammes, élite
// ============================================
const ChampionAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="championBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="100%" stopColor="#D97706" />
      </LinearGradient>
      <LinearGradient id="fireOrange" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#F59E0B" />
        <Stop offset="100%" stopColor="#FDE047" />
      </LinearGradient>
      <RadialGradient id="championGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="50%" stopColor="transparent" />
        <Stop offset="100%" stopColor="#FDE047" stopOpacity="0.5" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#championBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#championGlow)" />
    
    {/* Fire aura effect */}
    <G opacity={0.7}>
      <Path d="M14 28 Q10 22 16 18" stroke="#FDE047" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M12 40 Q6 34 14 30" stroke="#FBBF24" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M14 52 Q8 46 16 42" stroke="#FDE047" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </G>
    
    {/* Runner - yellow/gold */}
    <G transform="rotate(15, 50, 50)">
      {/* Crown with fire */}
      <Path d="M38 10 Q42 2 46 8 Q50 0 54 8 Q58 2 62 10" fill="#FDE047" />
      <Path d="M40 12 L44 4 L50 9 L56 4 L60 12 Z" fill="#FEF3C7" />
      
      <Circle cx="52" cy="20" r="8" fill="#FDE047" />
      <Path d="M44 28 Q42 36 40 50 L58 50 Q56 36 56 28 Z" fill="#FDE047" />
      <Path d="M40 32 Q24 48 14 62" stroke="#FDE047" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Path d="M58 32 Q74 22 86 14" stroke="#FDE047" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Path d="M42 50 Q24 68 8 88" stroke="#FDE047" strokeWidth="8" strokeLinecap="round" fill="none" />
      <Path d="M58 50 Q74 56 92 62" stroke="#FDE047" strokeWidth="8" strokeLinecap="round" fill="none" />
    </G>
    
    {/* Many sparkles */}
    <Sparkles color="#FEF3C7" positions={[
      {x: 88, y: 16, size: 3},
      {x: 84, y: 34, size: 2.5},
      {x: 90, y: 50, size: 2.5},
      {x: 86, y: 66, size: 2},
      {x: 18, y: 14, size: 2.5},
      {x: 22, y: 68, size: 2},
    ]} />
  </Svg>
);

// ============================================
// MAÎTRE - Rouge feu, légendaire
// ============================================
const MaitreAvatar = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="maitreBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#EF4444" />
        <Stop offset="100%" stopColor="#B91C1C" />
      </LinearGradient>
      <LinearGradient id="fireRed" x1="0%" y1="100%" x2="0%" y2="0%">
        <Stop offset="0%" stopColor="#EF4444" />
        <Stop offset="50%" stopColor="#F59E0B" />
        <Stop offset="100%" stopColor="#FDE047" />
      </LinearGradient>
      <RadialGradient id="maitreGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="40%" stopColor="transparent" />
        <Stop offset="70%" stopColor="#F59E0B" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#EF4444" stopOpacity="0.5" />
      </RadialGradient>
    </Defs>
    
    {/* Background */}
    <Circle cx="50" cy="50" r="46" fill="url(#maitreBg)" />
    <Circle cx="50" cy="50" r="44" fill="url(#maitreGlow)" />
    
    {/* Intense fire aura */}
    <G opacity={0.9}>
      <Path d="M12 24 Q6 18 14 12" stroke="#FDE047" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M10 36 Q2 30 12 24" stroke="#F59E0B" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M12 48 Q4 42 14 36" stroke="#EF4444" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M14 60 Q6 54 16 48" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </G>
    
    {/* Runner - orange/fire */}
    <G transform="rotate(16, 50, 50)">
      {/* Majestic fire crown */}
      <Path d="M32 8 Q38 -4 44 6 Q48 -6 52 4 Q56 -4 62 6 Q68 -2 72 8" fill="url(#fireRed)" />
      <Path d="M36 10 L42 0 L50 8 L58 0 L64 10 Z" fill="#FDE047" />
      <Circle cx="42" cy="5" r="2" fill="#EF4444" />
      <Circle cx="50" cy="2" r="2.5" fill="#EF4444" />
      <Circle cx="58" cy="5" r="2" fill="#EF4444" />
      
      <Circle cx="52" cy="20" r="8" fill="#F59E0B" />
      <Path d="M42 28 Q40 36 38 52 L60 52 Q58 36 58 28 Z" fill="#F59E0B" />
      <Path d="M38 32 Q20 50 8 66" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Path d="M60 32 Q78 18 92 8" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" fill="none" />
      <Path d="M40 52 Q20 72 2 94" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" fill="none" />
      <Path d="M60 52 Q78 58 98 62" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" fill="none" />
      
      {/* Fire on hands and feet */}
      <Circle cx="6" cy="68" r="5" fill="url(#fireRed)" />
      <Circle cx="94" cy="6" r="5" fill="url(#fireRed)" />
      <Ellipse cx="0" cy="96" rx="6" ry="4" fill="url(#fireRed)" />
      <Ellipse cx="100" cy="64" rx="6" ry="4" fill="url(#fireRed)" />
    </G>
    
    {/* Many fire particles */}
    <Sparkles color="#FDE047" positions={[
      {x: 92, y: 18, size: 3},
      {x: 88, y: 36, size: 2.5},
      {x: 94, y: 52, size: 3},
      {x: 90, y: 72, size: 2},
    ]} />
    <Sparkles color="#F59E0B" positions={[
      {x: 18, y: 10, size: 2.5},
      {x: 8, y: 78, size: 2.5},
      {x: 86, y: 86, size: 2},
    ]} />
    <Sparkles color="#FEF3C7" positions={[
      {x: 24, y: 4, size: 2},
      {x: 80, y: 28, size: 2},
    ]} />
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
