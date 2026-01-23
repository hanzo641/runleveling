import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Generate a unique device ID
const getDeviceId = () => {
  const stored = global.deviceId;
  if (stored) return stored;
  const newId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  global.deviceId = newId;
  return newId;
};

interface UserProgress {
  id: string;
  device_id: string;
  level: number;
  current_xp: number;
  xp_for_next_level: number;
  total_xp: number;
  rank: string;
  next_rank: string | null;
  next_rank_level: number | null;
  sessions_completed: number;
  total_duration_minutes: number;
  progress_percentage: number;
}

interface SessionResponse {
  xp_earned: number;
  leveled_up: boolean;
  levels_gained: number;
  ranked_up: boolean;
  old_rank: string;
  new_rank: string;
  progress: UserProgress;
}

const RANK_COLORS: Record<string, string> = {
  'E': '#6B7280',
  'D': '#10B981',
  'C': '#3B82F6',
  'B': '#8B5CF6',
  'A': '#F59E0B',
  'S': '#EF4444',
};

const RANK_NAMES: Record<string, string> = {
  'E': 'Débutant',
  'D': 'Amateur',
  'C': 'Intermédiaire',
  'B': 'Confirmé',
  'A': 'Expert',
  'S': 'Légende',
};

export default function Index() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; rank: string; rankedUp: boolean } | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [showXpGain, setShowXpGain] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const deviceId = useRef(getDeviceId());

  // Animation values
  const progressWidth = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const levelUpScale = useSharedValue(0);
  const levelUpOpacity = useSharedValue(0);
  const xpGainTranslateY = useSharedValue(0);
  const xpGainOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const rankGlow = useSharedValue(0);

  // Fetch user progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/progress/${deviceId.current}`);
      const data = await response.json();
      setProgress(data);
      progressWidth.value = withTiming(data.progress_percentage, { duration: 800 });
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Timer for running session
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
      
      // Pulse animation while running
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      pulseScale.value = withTiming(1);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsRunning(true);
    setSessionDuration(0);
    buttonScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
  };

  const completeSession = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsRunning(false);
    
    const durationMinutes = Math.max(1, Math.ceil(sessionDuration / 60));
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/session/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.current,
          duration_minutes: durationMinutes,
        }),
      });
      
      const data: SessionResponse = await response.json();
      
      // Show XP gain animation
      setXpGained(data.xp_earned);
      setShowXpGain(true);
      xpGainTranslateY.value = 0;
      xpGainOpacity.value = 1;
      xpGainTranslateY.value = withTiming(-100, { duration: 2000 });
      xpGainOpacity.value = withTiming(0, { duration: 2000 }, () => {
        runOnJS(setShowXpGain)(false);
      });

      // Animate progress bar
      const oldProgress = progress?.progress_percentage || 0;
      
      if (data.leveled_up) {
        // First fill to 100%, then reset and fill to new progress
        progressWidth.value = withSequence(
          withTiming(100, { duration: 500 }),
          withTiming(0, { duration: 100 }),
          withTiming(data.progress.progress_percentage, { duration: 500 })
        );
        
        // Show level up modal after progress animation
        setTimeout(() => {
          setLevelUpData({
            level: data.progress.level,
            rank: data.new_rank,
            rankedUp: data.ranked_up,
          });
          setShowLevelUp(true);
          levelUpScale.value = 0;
          levelUpOpacity.value = 0;
          levelUpScale.value = withSpring(1, { damping: 10 });
          levelUpOpacity.value = withTiming(1, { duration: 300 });
          
          if (data.ranked_up) {
            rankGlow.value = withRepeat(
              withSequence(
                withTiming(1, { duration: 500 }),
                withTiming(0, { duration: 500 })
              ),
              3
            );
          }
        }, 700);
      } else {
        progressWidth.value = withTiming(data.progress.progress_percentage, { duration: 800 });
      }

      setProgress(data.progress);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const closeLevelUp = () => {
    levelUpOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setShowLevelUp)(false);
      runOnJS(setLevelUpData)(null);
    });
  };

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const levelUpContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelUpScale.value }],
    opacity: levelUpOpacity.value,
  }));

  const xpGainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: xpGainTranslateY.value }],
    opacity: xpGainOpacity.value,
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const rankColor = RANK_COLORS[progress?.rank || 'E'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>RunQuest</Text>
        <Text style={styles.subtitle}>Niveau supérieur à chaque course</Text>
      </View>

      {/* Rank Badge */}
      <View style={styles.rankContainer}>
        <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
          <Text style={styles.rankLetter}>{progress?.rank || 'E'}</Text>
        </View>
        <Text style={[styles.rankName, { color: rankColor }]}>
          {RANK_NAMES[progress?.rank || 'E']}
        </Text>
        {progress?.next_rank && (
          <Text style={styles.nextRank}>
            Prochain rang: {progress.next_rank} (Niv. {progress.next_rank_level})
          </Text>
        )}
      </View>

      {/* Level Display */}
      <View style={styles.levelContainer}>
        <Text style={styles.levelLabel}>NIVEAU</Text>
        <Text style={styles.levelNumber}>{progress?.level || 1}</Text>
      </View>

      {/* XP Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View style={[styles.progressFill, progressBarStyle, { backgroundColor: rankColor }]} />
        </View>
        <View style={styles.xpTextContainer}>
          <Text style={styles.xpText}>
            {progress?.current_xp || 0} / {progress?.xp_for_next_level || 100} XP
          </Text>
        </View>
      </View>

      {/* XP Gain Animation */}
      {showXpGain && (
        <Animated.View style={[styles.xpGainContainer, xpGainStyle]}>
          <Text style={[styles.xpGainText, { color: rankColor }]}>+{xpGained} XP</Text>
        </Animated.View>
      )}

      {/* Session Timer (shown when running) */}
      {isRunning && (
        <View style={styles.timerContainer}>
          <Ionicons name="timer-outline" size={24} color="#6366F1" />
          <Text style={styles.timerText}>{formatDuration(sessionDuration)}</Text>
        </View>
      )}

      {/* Main Action Button */}
      <View style={styles.buttonContainer}>
        <Animated.View style={[pulseAnimatedStyle, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isRunning ? '#EF4444' : '#6366F1' },
            ]}
            onPress={isRunning ? completeSession : startSession}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRunning ? 'stop' : 'play'}
              size={48}
              color="#FFFFFF"
            />
            <Text style={styles.buttonText}>
              {isRunning ? 'TERMINER' : 'DÉMARRER'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="fitness-outline" size={20} color="#9CA3AF" />
          <Text style={styles.statValue}>{progress?.sessions_completed || 0}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={20} color="#9CA3AF" />
          <Text style={styles.statValue}>{progress?.total_duration_minutes || 0}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={20} color="#9CA3AF" />
          <Text style={styles.statValue}>{progress?.total_xp || 0}</Text>
          <Text style={styles.statLabel}>XP Total</Text>
        </View>
      </View>

      {/* Level Up Modal */}
      <Modal
        visible={showLevelUp}
        transparent
        animationType="none"
        onRequestClose={closeLevelUp}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeLevelUp}
        >
          <Animated.View style={[styles.levelUpModal, levelUpContainerStyle]}>
            <View style={styles.levelUpContent}>
              {levelUpData?.rankedUp ? (
                <>
                  <View style={[styles.levelUpBadge, { backgroundColor: RANK_COLORS[levelUpData.rank] }]}>
                    <Text style={styles.levelUpBadgeText}>{levelUpData.rank}</Text>
                  </View>
                  <Text style={styles.levelUpTitle}>NOUVEAU RANG !</Text>
                  <Text style={[styles.levelUpRankName, { color: RANK_COLORS[levelUpData.rank] }]}>
                    {RANK_NAMES[levelUpData.rank]}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="arrow-up-circle" size={80} color="#6366F1" />
                  <Text style={styles.levelUpTitle}>NIVEAU SUPÉRIEUR !</Text>
                </>
              )}
              <Text style={styles.levelUpLevel}>Niveau {levelUpData?.level}</Text>
              <Text style={styles.levelUpTap}>Touchez pour continuer</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  rankContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  rankBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rankLetter: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  rankName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  nextRank: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  levelContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  levelLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 2,
  },
  levelNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -8,
  },
  progressContainer: {
    paddingHorizontal: 32,
    marginTop: 16,
  },
  progressBackground: {
    height: 12,
    backgroundColor: '#1F1F1F',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpTextContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  xpText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  xpGainContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  xpGainText: {
    fontSize: 32,
    fontWeight: '900',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  actionButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2D2D2D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: SCREEN_WIDTH - 64,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  levelUpContent: {
    alignItems: 'center',
  },
  levelUpBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  levelUpBadgeText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelUpTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 2,
  },
  levelUpRankName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  levelUpLevel: {
    fontSize: 20,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '600',
  },
  levelUpTap: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 24,
  },
});
