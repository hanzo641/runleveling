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
  ScrollView,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Generate a unique device ID
const getDeviceId = () => {
  const stored = global.deviceId;
  if (stored) return stored;
  const newId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  global.deviceId = newId;
  return newId;
};

// Types
interface Rank {
  id: string;
  name: string;
  min_level: number;
  color: string;
  icon: string;
}

interface Quest {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  xp_reward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface Trophy {
  id: string;
  name: string;
  description: string;
  condition: string;
  xp_reward: number;
  icon: string;
}

interface UserProgress {
  id: string;
  device_id: string;
  username: string;
  level: number;
  current_xp: number;
  xp_for_next_level: number;
  total_xp: number;
  rank: Rank;
  next_rank: Rank | null;
  sessions_completed: number;
  total_duration_minutes: number;
  current_streak: number;
  best_streak: number;
  progress_percentage: number;
  trophies_unlocked: string[];
  daily_quests: Quest[];
}

interface Session {
  id: string;
  duration_minutes: number;
  intensity: string;
  intensity_name: string;
  xp_earned: number;
  level_before: number;
  level_after: number;
  leveled_up: boolean;
  completed_at: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  total_xp: number;
  player_rank: Rank;
  sessions_completed: number;
  is_current_user: boolean;
}

interface SessionResponse {
  xp_earned: number;
  leveled_up: boolean;
  levels_gained: number;
  ranked_up: boolean;
  old_rank: Rank;
  new_rank: Rank;
  progress: UserProgress;
  trophies_earned: Trophy[];
  quests_completed: Quest[];
}

const INTENSITY_OPTIONS = [
  { id: 'light', name: 'Léger', icon: 'walk-outline', color: '#10B981' },
  { id: 'moderate', name: 'Modéré', icon: 'fitness-outline', color: '#3B82F6' },
  { id: 'intense', name: 'Intense', icon: 'flame-outline', color: '#F59E0B' },
  { id: 'extreme', name: 'Extrême', icon: 'flash-outline', color: '#EF4444' },
];

type TabType = 'home' | 'quests' | 'trophies' | 'history' | 'leaderboard';

export default function Index() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [selectedIntensity, setSelectedIntensity] = useState('moderate');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; rank: Rank; rankedUp: boolean; oldRank?: Rank } | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [showXpGain, setShowXpGain] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allTrophies, setAllTrophies] = useState<{ unlocked: Trophy[]; locked: Trophy[] }>({ unlocked: [], locked: [] });
  const [showIntensityPicker, setShowIntensityPicker] = useState(false);
  const [showTrophyUnlock, setShowTrophyUnlock] = useState(false);
  const [unlockedTrophies, setUnlockedTrophies] = useState<Trophy[]>([]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');

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

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions/${deviceId.current}?limit=50`);
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard?device_id=${deviceId.current}&limit=50`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  const fetchTrophies = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/trophies/${deviceId.current}`);
      const data = await response.json();
      setAllTrophies(data);
    } catch (error) {
      console.error('Error fetching trophies:', error);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    if (activeTab === 'history') fetchSessions();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'trophies') fetchTrophies();
  }, [activeTab]);

  // Timer for running session
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const startSession = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowIntensityPicker(true);
  };

  const confirmStartSession = (intensity: string) => {
    setSelectedIntensity(intensity);
    setShowIntensityPicker(false);
    setIsRunning(true);
    setSessionDuration(0);
    buttonScale.value = withSequence(withSpring(0.9), withSpring(1));
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
          intensity: selectedIntensity,
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
      if (data.leveled_up) {
        progressWidth.value = withSequence(
          withTiming(100, { duration: 500 }),
          withTiming(0, { duration: 100 }),
          withTiming(data.progress.progress_percentage, { duration: 500 })
        );

        setTimeout(() => {
          setLevelUpData({
            level: data.progress.level,
            rank: data.new_rank,
            rankedUp: data.ranked_up,
            oldRank: data.old_rank,
          });
          setShowLevelUp(true);
          levelUpScale.value = 0;
          levelUpOpacity.value = 0;
          levelUpScale.value = withSpring(1, { damping: 10 });
          levelUpOpacity.value = withTiming(1, { duration: 300 });
        }, 700);
      } else {
        progressWidth.value = withTiming(data.progress.progress_percentage, { duration: 800 });
      }

      // Show trophy unlock if any
      if (data.trophies_earned && data.trophies_earned.length > 0) {
        setTimeout(() => {
          setUnlockedTrophies(data.trophies_earned);
          setShowTrophyUnlock(true);
        }, data.leveled_up ? 2500 : 1000);
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

  const updateUsername = async () => {
    if (newUsername.length < 2 || newUsername.length > 20) return;

    try {
      await fetch(`${BACKEND_URL}/api/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.current,
          username: newUsername,
        }),
      });
      setShowUsernameModal(false);
      fetchProgress();
      fetchLeaderboard();
    } catch (error) {
      console.error('Error updating username:', error);
    }
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
        <Text style={styles.loadingText}>RunLeveling</Text>
      </View>
    );
  }

  const rankColor = progress?.rank?.color || '#6B7280';

  // Render Home Tab
  const renderHomeTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Rank Badge */}
      <View style={styles.rankContainer}>
        <TouchableOpacity
          style={[styles.rankBadge, { backgroundColor: rankColor }]}
          onPress={() => setShowUsernameModal(true)}
        >
          <Text style={styles.rankIcon}>{progress?.rank?.icon || '🏃'}</Text>
        </TouchableOpacity>
        <Text style={[styles.rankName, { color: rankColor }]}>
          {progress?.rank?.name || 'Débutant'}
        </Text>
        <TouchableOpacity onPress={() => setShowUsernameModal(true)}>
          <Text style={styles.username}>{progress?.username || 'Runner'}</Text>
        </TouchableOpacity>
        {progress?.next_rank && (
          <Text style={styles.nextRank}>
            Prochain: {progress.next_rank.name} (Niv. {progress.next_rank.min_level})
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
            {progress?.current_xp || 0} / {progress?.xp_for_next_level || 150} XP
          </Text>
        </View>
      </View>

      {/* Streak */}
      {progress && progress.current_streak > 0 && (
        <View style={styles.streakContainer}>
          <Ionicons name="flame" size={20} color="#F59E0B" />
          <Text style={styles.streakText}>{progress.current_streak} jours de suite</Text>
        </View>
      )}

      {/* XP Gain Animation */}
      {showXpGain && (
        <Animated.View style={[styles.xpGainContainer, xpGainStyle]}>
          <Text style={[styles.xpGainText, { color: rankColor }]}>+{xpGained} XP</Text>
        </Animated.View>
      )}

      {/* Session Timer */}
      {isRunning && (
        <View style={styles.timerContainer}>
          <Ionicons name="timer-outline" size={24} color="#6366F1" />
          <Text style={styles.timerText}>{formatDuration(sessionDuration)}</Text>
          <View style={[styles.intensityBadge, { backgroundColor: INTENSITY_OPTIONS.find(i => i.id === selectedIntensity)?.color }]}>
            <Text style={styles.intensityBadgeText}>
              {INTENSITY_OPTIONS.find(i => i.id === selectedIntensity)?.name}
            </Text>
          </View>
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
    </ScrollView>
  );

  // Render Quests Tab
  const renderQuestsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Quêtes du Jour</Text>
      <Text style={styles.sectionSubtitle}>Se réinitialisent à minuit</Text>

      {progress?.daily_quests?.map((quest, index) => (
        <Animated.View
          key={quest.id}
          entering={SlideInRight.delay(index * 100)}
          style={[
            styles.questCard,
            quest.completed && styles.questCardCompleted
          ]}
        >
          <View style={styles.questHeader}>
            <View style={styles.questInfo}>
              <Text style={styles.questName}>{quest.name}</Text>
              <Text style={styles.questDescription}>{quest.description}</Text>
            </View>
            <View style={styles.questReward}>
              <Text style={styles.questXp}>+{quest.xp_reward}</Text>
              <Text style={styles.questXpLabel}>XP</Text>
            </View>
          </View>

          <View style={styles.questProgressContainer}>
            <View style={styles.questProgressBar}>
              <View
                style={[
                  styles.questProgressFill,
                  {
                    width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                    backgroundColor: quest.completed ? '#10B981' : '#6366F1'
                  }
                ]}
              />
            </View>
            <Text style={styles.questProgressText}>
              {quest.progress}/{quest.target}
            </Text>
          </View>

          {quest.completed && (
            <View style={styles.questCompletedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.questCompletedText}>Complétée!</Text>
            </View>
          )}
        </Animated.View>
      ))}
    </ScrollView>
  );

  // Render Trophies Tab
  const renderTrophiesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Trophées</Text>
      <Text style={styles.sectionSubtitle}>
        {allTrophies.unlocked.length} / {allTrophies.unlocked.length + allTrophies.locked.length} débloqués
      </Text>

      {allTrophies.unlocked.length > 0 && (
        <>
          <Text style={styles.trophySection}>Débloqués</Text>
          {allTrophies.unlocked.map((trophy, index) => (
            <Animated.View
              key={trophy.id}
              entering={FadeIn.delay(index * 50)}
              style={[styles.trophyCard, styles.trophyUnlocked]}
            >
              <Text style={styles.trophyIcon}>{trophy.icon}</Text>
              <View style={styles.trophyInfo}>
                <Text style={styles.trophyName}>{trophy.name}</Text>
                <Text style={styles.trophyDescription}>{trophy.description}</Text>
              </View>
              <View style={styles.trophyReward}>
                <Text style={styles.trophyXp}>+{trophy.xp_reward}</Text>
              </View>
            </Animated.View>
          ))}
        </>
      )}

      {allTrophies.locked.length > 0 && (
        <>
          <Text style={styles.trophySection}>À Débloquer</Text>
          {allTrophies.locked.map((trophy, index) => (
            <View key={trophy.id} style={[styles.trophyCard, styles.trophyLocked]}>
              <Text style={[styles.trophyIcon, { opacity: 0.3 }]}>{trophy.icon}</Text>
              <View style={styles.trophyInfo}>
                <Text style={[styles.trophyName, { color: '#6B7280' }]}>{trophy.name}</Text>
                <Text style={styles.trophyDescription}>{trophy.description}</Text>
              </View>
              <View style={styles.trophyReward}>
                <Text style={[styles.trophyXp, { color: '#6B7280' }]}>+{trophy.xp_reward}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  // Render History Tab
  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Historique</Text>
      <Text style={styles.sectionSubtitle}>{sessions.length} sessions enregistrées</Text>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={SlideInRight.delay(index * 50)}
            style={styles.historyCard}
          >
            <View style={styles.historyHeader}>
              <View style={styles.historyDate}>
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                <Text style={styles.historyDateText}>{formatDate(item.completed_at)}</Text>
              </View>
              <View style={[
                styles.historyIntensity,
                { backgroundColor: INTENSITY_OPTIONS.find(i => i.id === item.intensity)?.color || '#6B7280' }
              ]}>
                <Text style={styles.historyIntensityText}>{item.intensity_name}</Text>
              </View>
            </View>

            <View style={styles.historyStats}>
              <View style={styles.historyStat}>
                <Ionicons name="time-outline" size={18} color="#6366F1" />
                <Text style={styles.historyStatValue}>{item.duration_minutes} min</Text>
              </View>
              <View style={styles.historyStat}>
                <Ionicons name="star" size={18} color="#F59E0B" />
                <Text style={styles.historyStatValue}>+{item.xp_earned} XP</Text>
              </View>
              {item.leveled_up && (
                <View style={styles.historyStat}>
                  <Ionicons name="arrow-up-circle" size={18} color="#10B981" />
                  <Text style={[styles.historyStatValue, { color: '#10B981' }]}>
                    Niv. {item.level_after}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyText}>Aucune session</Text>
            <Text style={styles.emptySubtext}>Commence ta première course!</Text>
          </View>
        }
      />
    </View>
  );

  // Render Leaderboard Tab
  const renderLeaderboardTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Classement</Text>
      <Text style={styles.sectionSubtitle}>Top 50 joueurs</Text>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => `${item.rank}-${item.username}`}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={SlideInRight.delay(index * 30)}
            style={[
              styles.leaderboardCard,
              item.is_current_user && styles.leaderboardCardCurrentUser
            ]}
          >
            <View style={styles.leaderboardRank}>
              {item.rank <= 3 ? (
                <Text style={styles.leaderboardMedal}>
                  {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                </Text>
              ) : (
                <Text style={styles.leaderboardRankText}>#{item.rank}</Text>
              )}
            </View>

            <View style={[styles.leaderboardBadge, { backgroundColor: item.player_rank.color }]}>
              <Text style={styles.leaderboardBadgeText}>{item.player_rank.icon}</Text>
            </View>

            <View style={styles.leaderboardInfo}>
              <Text style={[
                styles.leaderboardName,
                item.is_current_user && { color: '#6366F1' }
              ]}>
                {item.username} {item.is_current_user && '(Toi)'}
              </Text>
              <Text style={styles.leaderboardStats}>
                Niv. {item.level} • {item.total_xp} XP
              </Text>
            </View>

            <Text style={styles.leaderboardSessions}>
              {item.sessions_completed}
            </Text>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyText}>Classement vide</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>RunLeveling</Text>
      </View>

      {/* Tab Content */}
      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'quests' && renderQuestsTab()}
      {activeTab === 'trophies' && renderTrophiesTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'leaderboard' && renderLeaderboardTab()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'home' ? '#6366F1' : '#6B7280'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'quests' && styles.navItemActive]}
          onPress={() => setActiveTab('quests')}
        >
          <Ionicons
            name={activeTab === 'quests' ? 'flag' : 'flag-outline'}
            size={24}
            color={activeTab === 'quests' ? '#6366F1' : '#6B7280'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'trophies' && styles.navItemActive]}
          onPress={() => setActiveTab('trophies')}
        >
          <Ionicons
            name={activeTab === 'trophies' ? 'trophy' : 'trophy-outline'}
            size={24}
            color={activeTab === 'trophies' ? '#6366F1' : '#6B7280'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'history' && styles.navItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name={activeTab === 'history' ? 'time' : 'time-outline'}
            size={24}
            color={activeTab === 'history' ? '#6366F1' : '#6B7280'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'leaderboard' && styles.navItemActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Ionicons
            name={activeTab === 'leaderboard' ? 'podium' : 'podium-outline'}
            size={24}
            color={activeTab === 'leaderboard' ? '#6366F1' : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Intensity Picker Modal */}
      <Modal
        visible={showIntensityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIntensityPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIntensityPicker(false)}
        >
          <View style={styles.intensityModal}>
            <Text style={styles.intensityModalTitle}>Choisis l'intensité</Text>
            <Text style={styles.intensityModalSubtitle}>Plus c'est intense, plus tu gagnes d'XP!</Text>

            {INTENSITY_OPTIONS.map((intensity) => (
              <TouchableOpacity
                key={intensity.id}
                style={[styles.intensityOption, { borderColor: intensity.color }]}
                onPress={() => confirmStartSession(intensity.id)}
              >
                <Ionicons name={intensity.icon as any} size={28} color={intensity.color} />
                <Text style={[styles.intensityOptionText, { color: intensity.color }]}>
                  {intensity.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
                  <View style={[styles.levelUpBadge, { backgroundColor: levelUpData.rank.color }]}>
                    <Text style={styles.levelUpBadgeIcon}>{levelUpData.rank.icon}</Text>
                  </View>
                  <Text style={styles.levelUpTitle}>NOUVEAU RANG!</Text>
                  <Text style={[styles.levelUpRankName, { color: levelUpData.rank.color }]}>
                    {levelUpData.rank.name}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="arrow-up-circle" size={80} color="#6366F1" />
                  <Text style={styles.levelUpTitle}>NIVEAU SUPÉRIEUR!</Text>
                </>
              )}
              <Text style={styles.levelUpLevel}>Niveau {levelUpData?.level}</Text>
              <Text style={styles.levelUpTap}>Touchez pour continuer</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Trophy Unlock Modal */}
      <Modal
        visible={showTrophyUnlock}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTrophyUnlock(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTrophyUnlock(false)}
        >
          <View style={styles.trophyUnlockModal}>
            <Text style={styles.trophyUnlockTitle}>Trophée Débloqué!</Text>
            {unlockedTrophies.map((trophy) => (
              <View key={trophy.id} style={styles.trophyUnlockItem}>
                <Text style={styles.trophyUnlockIcon}>{trophy.icon}</Text>
                <View>
                  <Text style={styles.trophyUnlockName}>{trophy.name}</Text>
                  <Text style={styles.trophyUnlockXp}>+{trophy.xp_reward} XP</Text>
                </View>
              </View>
            ))}
            <Text style={styles.levelUpTap}>Touchez pour continuer</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Username Modal */}
      <Modal
        visible={showUsernameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.usernameModal}>
            <Text style={styles.usernameModalTitle}>Ton pseudo</Text>
            <TextInput
              style={styles.usernameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder={progress?.username || 'Runner'}
              placeholderTextColor="#6B7280"
              maxLength={20}
              autoFocus
            />
            <View style={styles.usernameButtons}>
              <TouchableOpacity
                style={styles.usernameCancel}
                onPress={() => setShowUsernameModal(false)}
              >
                <Text style={styles.usernameCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.usernameSave}
                onPress={updateUsername}
              >
                <Text style={styles.usernameSaveText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  loadingText: {
    color: '#6366F1',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  rankContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  rankBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIcon: {
    fontSize: 36,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  username: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  nextRank: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  levelContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  levelLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 2,
  },
  levelNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -6,
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  progressBackground: {
    height: 10,
    backgroundColor: '#1F1F1F',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  xpTextContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  xpText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  streakText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  xpGainContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  xpGainText: {
    fontSize: 28,
    fontWeight: '900',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2D2D2D',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#6366F1',
    marginTop: -1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  questCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  questCardCompleted: {
    borderColor: '#10B981',
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questInfo: {
    flex: 1,
    marginRight: 12,
  },
  questName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  questDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  questReward: {
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  questXp: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },
  questXpLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  questProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  questProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#2D2D2D',
    borderRadius: 3,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  questCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  questCompletedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  trophySection: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 8,
  },
  trophyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  trophyUnlocked: {
    borderColor: '#F59E0B',
  },
  trophyLocked: {
    borderColor: '#2D2D2D',
  },
  trophyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  trophyInfo: {
    flex: 1,
  },
  trophyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trophyDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  trophyReward: {
    marginLeft: 8,
  },
  trophyXp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  historyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  historyIntensity: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  historyIntensityText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  leaderboardCardCurrentUser: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  leaderboardRank: {
    width: 36,
    alignItems: 'center',
  },
  leaderboardMedal: {
    fontSize: 24,
  },
  leaderboardRankText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  leaderboardBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  leaderboardBadgeText: {
    fontSize: 18,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  leaderboardStats: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  leaderboardSessions: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  intensityModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  intensityModalSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  intensityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    gap: 10,
  },
  intensityOptionText: {
    fontSize: 18,
    fontWeight: '700',
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
  levelUpBadgeIcon: {
    fontSize: 48,
  },
  levelUpTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
    letterSpacing: 2,
  },
  levelUpRankName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  levelUpLevel: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 10,
    fontWeight: '600',
  },
  levelUpTap: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 20,
  },
  trophyUnlockModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: SCREEN_WIDTH - 64,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  trophyUnlockTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 16,
  },
  trophyUnlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  trophyUnlockIcon: {
    fontSize: 40,
  },
  trophyUnlockName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trophyUnlockXp: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  usernameModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  usernameModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  usernameInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  usernameButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  usernameCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
  },
  usernameCancelText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
  usernameSave: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  usernameSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
