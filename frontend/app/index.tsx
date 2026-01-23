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
  Alert,
  Switch,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import RankAvatar from '../components/RankAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  total_distance_km: number;
  current_streak: number;
  best_streak: number;
  progress_percentage: number;
  trophies_unlocked: string[];
  daily_quests: Quest[];
  best_pace: string | null;
  notification_enabled: boolean;
  notification_time: string;
}

interface SessionDetail {
  id: string;
  duration_minutes: number;
  duration_seconds: number;
  intensity: string;
  intensity_name: string;
  xp_earned: number;
  distance_km: number;
  avg_pace: string;
  max_pace: string;
  min_pace: string;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  elevation_gain: number;
  elevation_loss: number;
  calories_burned: number;
  leveled_up: boolean;
  level_after: number;
  completed_at: string;
  route_points: any[];
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  total_xp: number;
  player_rank: Rank;
  sessions_completed: number;
  total_distance_km: number;
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

interface StravaStatus {
  connected: boolean;
  athlete_name: string | null;
  athlete_id: number | null;
  connected_at?: string;
}

interface StravaSyncResult {
  activities_synced: number;
  total_xp_earned: number;
  new_sessions: string[];
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
}

const INTENSITY_OPTIONS = [
  { id: 'light', name: 'Léger', icon: 'walk-outline', color: '#10B981', rule: '> 7:00/km' },
  { id: 'moderate', name: 'Modéré', icon: 'fitness-outline', color: '#3B82F6', rule: '6:00 - 7:00/km' },
  { id: 'intense', name: 'Intense', icon: 'flame-outline', color: '#F59E0B', rule: '5:00 - 6:00/km' },
  { id: 'extreme', name: 'Extrême', icon: 'flash-outline', color: '#EF4444', rule: '< 5:00/km' },
];

type TabType = 'home' | 'quests' | 'trophies' | 'history' | 'leaderboard';

// Calculate distance between two GPS points (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format pace as mm:ss
const formatPace = (secondsPerKm: number): string => {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Estimate calories burned (rough estimation)
const estimateCalories = (durationMinutes: number, distanceKm: number, intensity: string): number => {
  const baseCal = durationMinutes * 8; // ~8 cal/min base
  const distanceCal = distanceKm * 60; // ~60 cal/km
  const intensityMult = { light: 0.8, moderate: 1.0, intense: 1.2, extreme: 1.4 }[intensity] || 1.0;
  return Math.round((baseCal + distanceCal) * intensityMult);
};

export default function Index() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; rank: Rank; rankedUp: boolean; oldRank?: Rank } | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [showXpGain, setShowXpGain] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allTrophies, setAllTrophies] = useState<{ unlocked: Trophy[]; locked: Trophy[] }>({ unlocked: [], locked: [] });
  const [showIntensityInfo, setShowIntensityInfo] = useState(false);
  const [showTrophyUnlock, setShowTrophyUnlock] = useState(false);
  const [unlockedTrophies, setUnlockedTrophies] = useState<Trophy[]>([]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState('08:00');

  // Strava state
  const [stravaStatus, setStravaStatus] = useState<StravaStatus>({ connected: false, athlete_name: null, athlete_id: null });
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaConnecting, setStravaConnecting] = useState(false);

  // GPS tracking state
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [routePoints, setRoutePoints] = useState<LocationPoint[]>([]);
  const [paces, setPaces] = useState<number[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocation = useRef<LocationPoint | null>(null);
  const deviceId = useRef(getDeviceId());

  // Animation values - using React Native's Animated API
  const progressWidthAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const levelUpScaleAnim = useRef(new Animated.Value(0)).current;
  const levelUpOpacityAnim = useRef(new Animated.Value(0)).current;
  const xpGainTranslateYAnim = useRef(new Animated.Value(0)).current;
  const xpGainOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseScaleAnim = useRef(new Animated.Value(1)).current;
  const [progressPercent, setProgressPercent] = useState(0);

  // Request permissions
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // Location permission
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus === 'granted');

    // Notification permission
    if (Platform.OS !== 'web') {
      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus === 'granted') {
        setupDailyNotification();
      }
    }
  };

  const setupDailyNotification = async () => {
    if (Platform.OS === 'web') return;
    
    // Cancel existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (notificationsEnabled) {
      const [hours, minutes] = notificationTime.split(':').map(Number);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏃 RunLeveling',
          body: 'C\'est l\'heure de ta course quotidienne ! Ne perds pas ta streak !',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  };

  // Fetch user progress
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/progress/${deviceId.current}`);
      const data = await response.json();
      setProgress(data);
      setNotificationsEnabled(data.notification_enabled);
      setNotificationTime(data.notification_time);
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

  // Strava functions
  const fetchStravaStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/strava/status/${deviceId.current}`);
      const data = await response.json();
      setStravaStatus(data);
    } catch (error) {
      console.error('Error fetching Strava status:', error);
    }
  }, []);

  const connectStrava = async () => {
    setStravaConnecting(true);
    try {
      // Get auth URL from backend
      const response = await fetch(`${BACKEND_URL}/api/strava/auth-url?device_id=${deviceId.current}`);
      const data = await response.json();
      
      if (data.auth_url) {
        // Open Strava authorization page
        const result = await WebBrowser.openAuthSessionAsync(
          data.auth_url,
          'runleveling://strava-callback'
        );
        
        if (result.type === 'success' && result.url) {
          // Extract authorization code from callback URL
          const url = new URL(result.url);
          const code = url.searchParams.get('code');
          
          if (code) {
            // Exchange code for token
            const connectResponse = await fetch(`${BACKEND_URL}/api/strava/connect`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ device_id: deviceId.current, code }),
            });
            
            if (connectResponse.ok) {
              const connectData = await connectResponse.json();
              setStravaStatus({
                connected: true,
                athlete_name: connectData.athlete_name,
                athlete_id: connectData.athlete_id,
              });
              
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              Alert.alert(
                '🎉 Strava connecté !',
                `Bienvenue ${connectData.athlete_name} ! Tes activités Strava peuvent maintenant être synchronisées.`,
                [{ text: 'Synchroniser', onPress: () => syncStravaActivities() }, { text: 'Plus tard' }]
              );
            } else {
              Alert.alert('Erreur', 'Impossible de connecter Strava. Réessaie.');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error connecting Strava:', error);
      Alert.alert('Erreur', 'Impossible de connecter Strava. Vérifie ta connexion.');
    } finally {
      setStravaConnecting(false);
    }
  };

  const disconnectStrava = async () => {
    Alert.alert(
      'Déconnecter Strava',
      'Es-tu sûr de vouloir déconnecter ton compte Strava ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/strava/disconnect/${deviceId.current}`, {
                method: 'DELETE',
              });
              setStravaStatus({ connected: false, athlete_name: null, athlete_id: null });
              
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
            } catch (error) {
              console.error('Error disconnecting Strava:', error);
            }
          },
        },
      ]
    );
  };

  const syncStravaActivities = async () => {
    setStravaSyncing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/strava/sync/${deviceId.current}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data: StravaSyncResult = await response.json();
        
        if (data.activities_synced > 0) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          Alert.alert(
            '✅ Synchronisation réussie !',
            `${data.activities_synced} activité(s) importée(s)\n+${data.total_xp_earned} XP gagnés !`
          );
          
          // Refresh data
          fetchProgress();
          fetchSessions();
        } else {
          Alert.alert(
            'Synchronisation terminée',
            'Aucune nouvelle activité à importer. Fais une course sur Strava et reviens !'
          );
        }
      } else {
        Alert.alert('Erreur', 'Impossible de synchroniser les activités Strava.');
      }
    } catch (error) {
      console.error('Error syncing Strava:', error);
      Alert.alert('Erreur', 'Erreur lors de la synchronisation.');
    } finally {
      setStravaSyncing(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    fetchStravaStatus();
  }, [fetchProgress, fetchStravaStatus]);

  useEffect(() => {
    if (activeTab === 'history') fetchSessions();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'trophies') fetchTrophies();
  }, [activeTab]);

  // Start GPS tracking
  const startLocationTracking = async () => {
    if (!locationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Le GPS est nécessaire pour tracker ta course.');
        return;
      }
      setLocationPermission(true);
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (location) => {
        const newPoint: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        };

        // Calculate distance from last point
        if (lastLocation.current) {
          const dist = calculateDistance(
            lastLocation.current.latitude,
            lastLocation.current.longitude,
            newPoint.latitude,
            newPoint.longitude
          );
          
          if (dist > 0.001) { // Minimum 1m to count
            setCurrentDistance((prev) => prev + dist);
            
            // Calculate pace (seconds per km)
            const timeDiff = (newPoint.timestamp - lastLocation.current.timestamp) / 1000;
            if (dist > 0 && timeDiff > 0) {
              const pace = (timeDiff / dist); // seconds per km
              if (pace > 0 && pace < 1800) { // Valid pace (< 30 min/km)
                setPaces((prev) => [...prev, pace]);
                setCurrentPace(pace);
              }
            }

            // Elevation tracking
            if (newPoint.altitude && lastLocation.current.altitude) {
              const elevDiff = newPoint.altitude - lastLocation.current.altitude;
              if (elevDiff > 0) {
                setElevationGain((prev) => prev + elevDiff);
              } else {
                setElevationLoss((prev) => prev + Math.abs(elevDiff));
              }
            }
          }
        }

        // Update speed
        if (newPoint.speed && newPoint.speed > 0) {
          const speedKmh = newPoint.speed * 3.6;
          setCurrentSpeed(speedKmh);
          setMaxSpeed((prev) => Math.max(prev, speedKmh));
        }

        lastLocation.current = newPoint;
        setRoutePoints((prev) => [...prev, newPoint]);
      }
    );
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
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

  const startSession = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Reset GPS data
    setCurrentDistance(0);
    setCurrentSpeed(0);
    setCurrentPace(0);
    setMaxSpeed(0);
    setElevationGain(0);
    setElevationLoss(0);
    setRoutePoints([]);
    setPaces([]);
    lastLocation.current = null;
    
    // Start tracking
    await startLocationTracking();
    
    setIsRunning(true);
    setSessionDuration(0);
    buttonScale.value = withSequence(withSpring(0.9), withSpring(1));
  };

  // Calculate intensity from pace (for display during session)
  const getCurrentIntensity = () => {
    if (currentPace <= 0) return null;
    if (currentPace < 300) return INTENSITY_OPTIONS[3]; // Extrême < 5:00
    if (currentPace < 360) return INTENSITY_OPTIONS[2]; // Intense 5:00-6:00
    if (currentPace < 420) return INTENSITY_OPTIONS[1]; // Modéré 6:00-7:00
    return INTENSITY_OPTIONS[0]; // Léger > 7:00
  };

  const completeSession = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsRunning(false);
    stopLocationTracking();

    const durationMinutes = Math.floor(sessionDuration / 60);
    const durationSeconds = sessionDuration % 60;
    
    // Calculate stats
    const avgPace = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;
    const minPace = paces.length > 0 ? Math.min(...paces) : 0; // Best pace
    const maxPaceVal = paces.length > 0 ? Math.max(...paces) : 0; // Worst pace
    const avgSpeed = currentDistance > 0 && sessionDuration > 0 ? (currentDistance / sessionDuration) * 3600 : 0;
    
    // Estimate calories based on calculated intensity
    let estimatedIntensity = 'moderate';
    if (avgPace > 0) {
      if (avgPace < 300) estimatedIntensity = 'extreme';
      else if (avgPace < 360) estimatedIntensity = 'intense';
      else if (avgPace < 420) estimatedIntensity = 'moderate';
      else estimatedIntensity = 'light';
    }
    const calories = estimateCalories(durationMinutes, currentDistance, estimatedIntensity);

    // Simplify route for storage (every 10th point)
    const simplifiedRoute = routePoints.filter((_, i) => i % 10 === 0).map(p => ({
      lat: p.latitude,
      lng: p.longitude
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/session/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.current,
          duration_minutes: durationMinutes,
          duration_seconds: durationSeconds,
          distance_km: currentDistance,
          avg_pace_seconds: avgPace,
          max_pace_seconds: minPace, // Best pace (lowest time)
          min_pace_seconds: maxPaceVal, // Worst pace (highest time)
          avg_speed_kmh: avgSpeed,
          max_speed_kmh: maxSpeed,
          elevation_gain: elevationGain,
          elevation_loss: elevationLoss,
          calories_burned: calories,
          route_points: simplifiedRoute,
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

  const updateNotificationSettings = async (enabled: boolean, time: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.current,
          enabled,
          time,
        }),
      });
      setNotificationsEnabled(enabled);
      setNotificationTime(time);
      setupDailyNotification();
    } catch (error) {
      console.error('Error updating notifications:', error);
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
      {/* Avatar & Rank */}
      <View style={styles.rankContainer}>
        <TouchableOpacity onPress={() => setShowUsernameModal(true)}>
          <RankAvatar 
            rankId={progress?.rank?.id || 'debutant'} 
            size={90} 
            showGlow={true}
          />
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

      {/* Streak & Best Pace */}
      <View style={styles.streakRow}>
        {progress && progress.current_streak > 0 && (
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
            <Text style={styles.streakText}>{progress.current_streak}j</Text>
          </View>
        )}
        {progress?.best_pace && (
          <View style={styles.streakContainer}>
            <Ionicons name="speedometer" size={18} color="#10B981" />
            <Text style={[styles.streakText, { color: '#10B981' }]}>{progress.best_pace}/km</Text>
          </View>
        )}
      </View>

      {/* XP Gain Animation */}
      {showXpGain && (
        <Animated.View style={[styles.xpGainContainer, xpGainStyle]}>
          <Text style={[styles.xpGainText, { color: rankColor }]}>+{xpGained} XP</Text>
        </Animated.View>
      )}

      {/* Live GPS Stats (when running) */}
      {isRunning && (
        <View style={styles.liveStatsContainer}>
          <View style={styles.liveStatRow}>
            <View style={styles.liveStat}>
              <Ionicons name="navigate" size={20} color="#3B82F6" />
              <Text style={styles.liveStatValue}>{currentDistance.toFixed(2)}</Text>
              <Text style={styles.liveStatLabel}>km</Text>
            </View>
            <View style={styles.liveStat}>
              <Ionicons name="speedometer" size={20} color="#10B981" />
              <Text style={styles.liveStatValue}>{formatPace(currentPace)}</Text>
              <Text style={styles.liveStatLabel}>/km</Text>
            </View>
            <View style={styles.liveStat}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <Text style={styles.liveStatValue}>{currentSpeed.toFixed(1)}</Text>
              <Text style={styles.liveStatLabel}>km/h</Text>
            </View>
          </View>
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={24} color="#6366F1" />
            <Text style={styles.timerText}>{formatDuration(sessionDuration)}</Text>
            {getCurrentIntensity() && (
              <View style={[styles.intensityBadge, { backgroundColor: getCurrentIntensity()?.color }]}>
                <Text style={styles.intensityBadgeText}>
                  {getCurrentIntensity()?.name}
                </Text>
              </View>
            )}
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
          <Ionicons name="navigate-outline" size={20} color="#9CA3AF" />
          <Text style={styles.statValue}>{(progress?.total_distance_km || 0).toFixed(1)}</Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={20} color="#9CA3AF" />
          <Text style={styles.statValue}>{progress?.total_xp || 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </View>

      {/* Bottom buttons row */}
      <View style={styles.bottomButtonsRow}>
        <TouchableOpacity style={styles.infoButton} onPress={() => setShowIntensityInfo(true)}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          <Text style={styles.infoButtonText}>Intensités</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
          <Ionicons name="settings-outline" size={18} color="#6B7280" />
          <Text style={styles.settingsText}>Paramètres</Text>
        </TouchableOpacity>
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
              {typeof quest.target === 'number' ? `${Math.min(quest.progress, quest.target)}/${quest.target}` : quest.completed ? '✓' : '○'}
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
          {allTrophies.locked.map((trophy) => (
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

  // Render History Tab with detailed session info
  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Historique</Text>
      <Text style={styles.sectionSubtitle}>{sessions.length} courses enregistrées</Text>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedSession(item);
              setShowSessionDetail(true);
            }}
          >
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
                  <Ionicons name="navigate" size={16} color="#3B82F6" />
                  <Text style={styles.historyStatValue}>{item.distance_km.toFixed(2)} km</Text>
                </View>
                <View style={styles.historyStat}>
                  <Ionicons name="time-outline" size={16} color="#6366F1" />
                  <Text style={styles.historyStatValue}>{item.duration_minutes}:{(item.duration_seconds || 0).toString().padStart(2, '0')}</Text>
                </View>
                <View style={styles.historyStat}>
                  <Ionicons name="speedometer" size={16} color="#10B981" />
                  <Text style={styles.historyStatValue}>{item.avg_pace}/km</Text>
                </View>
              </View>

              <View style={styles.historyFooter}>
                <Text style={styles.historyXp}>+{item.xp_earned} XP</Text>
                {item.leveled_up && (
                  <View style={styles.levelUpBadgeSmall}>
                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                    <Text style={styles.levelUpBadgeText}>Niv. {item.level_after}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </View>
            </Animated.View>
          </TouchableOpacity>
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
              <Text style={styles.leaderboardBadgeIcon}>{item.player_rank.icon}</Text>
            </View>

            <View style={styles.leaderboardInfo}>
              <Text style={[
                styles.leaderboardName,
                item.is_current_user && { color: '#6366F1' }
              ]}>
                {item.username} {item.is_current_user && '(Toi)'}
              </Text>
              <Text style={styles.leaderboardStats}>
                Niv. {item.level} • {item.total_distance_km} km
              </Text>
            </View>

            <Text style={styles.leaderboardXp}>{item.total_xp}</Text>
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
        {[
          { id: 'home', icon: 'home' },
          { id: 'quests', icon: 'flag' },
          { id: 'trophies', icon: 'trophy' },
          { id: 'history', icon: 'time' },
          { id: 'leaderboard', icon: 'podium' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.navItem, activeTab === tab.id && styles.navItemActive]}
            onPress={() => setActiveTab(tab.id as TabType)}
          >
            <Ionicons
              name={activeTab === tab.id ? tab.icon as any : `${tab.icon}-outline` as any}
              size={24}
              color={activeTab === tab.id ? '#6366F1' : '#6B7280'}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Intensity Info Modal */}
      <Modal
        visible={showIntensityInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIntensityInfo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIntensityInfo(false)}
        >
          <View style={styles.intensityModal}>
            <Text style={styles.intensityModalTitle}>Intensité Automatique</Text>
            <Text style={styles.intensityModalSubtitle}>Basée sur ton allure moyenne</Text>

            {INTENSITY_OPTIONS.map((intensity) => (
              <View
                key={intensity.id}
                style={[styles.intensityInfoRow, { borderLeftColor: intensity.color }]}
              >
                <Ionicons name={intensity.icon as any} size={24} color={intensity.color} />
                <View style={styles.intensityInfoText}>
                  <Text style={[styles.intensityOptionText, { color: intensity.color }]}>
                    {intensity.name}
                  </Text>
                  <Text style={styles.intensityRuleText}>{intensity.rule}</Text>
                </View>
                <Text style={[styles.intensityMultiplier, { color: intensity.color }]}>
                  x{intensity.id === 'light' ? '0.5' : intensity.id === 'moderate' ? '1.0' : intensity.id === 'intense' ? '1.5' : '2.0'}
                </Text>
              </View>
            ))}

            <Text style={styles.intensityNote}>
              L'intensité est calculée à la fin de ta course selon ton allure moyenne !
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        visible={showSessionDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSessionDetail(false)}
      >
        <View style={styles.sessionDetailModal}>
          <View style={styles.sessionDetailHeader}>
            <Text style={styles.sessionDetailTitle}>Détails de la course</Text>
            <TouchableOpacity onPress={() => setShowSessionDetail(false)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {selectedSession && (
            <ScrollView style={styles.sessionDetailContent}>
              <View style={styles.sessionDetailSection}>
                <Text style={styles.sessionDetailDate}>
                  {formatDate(selectedSession.completed_at)}
                </Text>
                <View style={[
                  styles.sessionDetailIntensity,
                  { backgroundColor: INTENSITY_OPTIONS.find(i => i.id === selectedSession.intensity)?.color }
                ]}>
                  <Text style={styles.sessionDetailIntensityText}>{selectedSession.intensity_name}</Text>
                </View>
              </View>

              <View style={styles.sessionDetailGrid}>
                <View style={styles.sessionDetailStat}>
                  <Ionicons name="navigate" size={24} color="#3B82F6" />
                  <Text style={styles.sessionDetailStatValue}>{selectedSession.distance_km.toFixed(2)}</Text>
                  <Text style={styles.sessionDetailStatLabel}>km parcourus</Text>
                </View>
                <View style={styles.sessionDetailStat}>
                  <Ionicons name="time" size={24} color="#6366F1" />
                  <Text style={styles.sessionDetailStatValue}>
                    {selectedSession.duration_minutes}:{(selectedSession.duration_seconds || 0).toString().padStart(2, '0')}
                  </Text>
                  <Text style={styles.sessionDetailStatLabel}>durée</Text>
                </View>
                <View style={styles.sessionDetailStat}>
                  <Ionicons name="speedometer" size={24} color="#10B981" />
                  <Text style={styles.sessionDetailStatValue}>{selectedSession.avg_pace}</Text>
                  <Text style={styles.sessionDetailStatLabel}>allure moy.</Text>
                </View>
                <View style={styles.sessionDetailStat}>
                  <Ionicons name="flash" size={24} color="#F59E0B" />
                  <Text style={styles.sessionDetailStatValue}>{selectedSession.max_pace}</Text>
                  <Text style={styles.sessionDetailStatLabel}>meilleure allure</Text>
                </View>
                <View style={styles.sessionDetailStat}>
                  <Ionicons name="rocket" size={24} color="#EF4444" />
                  <Text style={styles.sessionDetailStatValue}>{selectedSession.max_speed_kmh.toFixed(1)}</Text>
                  <Text style={styles.sessionDetailStatLabel}>vitesse max km/h</Text>
                </View>
                <View style={styles.sessionDetailStat}>
                  <Ionicons name="trending-up" size={24} color="#8B5CF6" />
                  <Text style={styles.sessionDetailStatValue}>{selectedSession.avg_speed_kmh.toFixed(1)}</Text>
                  <Text style={styles.sessionDetailStatLabel}>vitesse moy. km/h</Text>
                </View>
              </View>

              <View style={styles.sessionDetailSection}>
                <Text style={styles.sessionDetailSectionTitle}>Dénivelé</Text>
                <View style={styles.sessionDetailRow}>
                  <View style={styles.sessionDetailRowItem}>
                    <Ionicons name="arrow-up" size={20} color="#10B981" />
                    <Text style={styles.sessionDetailRowValue}>+{selectedSession.elevation_gain.toFixed(0)} m</Text>
                  </View>
                  <View style={styles.sessionDetailRowItem}>
                    <Ionicons name="arrow-down" size={20} color="#EF4444" />
                    <Text style={styles.sessionDetailRowValue}>-{selectedSession.elevation_loss.toFixed(0)} m</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sessionDetailSection}>
                <Text style={styles.sessionDetailSectionTitle}>Calories</Text>
                <View style={styles.sessionDetailRow}>
                  <Ionicons name="flame" size={24} color="#F59E0B" />
                  <Text style={styles.sessionDetailCalories}>{selectedSession.calories_burned} kcal</Text>
                </View>
              </View>

              <View style={styles.sessionDetailSection}>
                <Text style={styles.sessionDetailSectionTitle}>Récompenses</Text>
                <View style={styles.sessionDetailRow}>
                  <Ionicons name="star" size={24} color="#F59E0B" />
                  <Text style={styles.sessionDetailXp}>+{selectedSession.xp_earned} XP</Text>
                  {selectedSession.leveled_up && (
                    <View style={styles.sessionDetailLevelUp}>
                      <Ionicons name="arrow-up-circle" size={20} color="#10B981" />
                      <Text style={styles.sessionDetailLevelUpText}>Niveau {selectedSession.level_after}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
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
                  <View style={[styles.levelUpBadgeBig, { backgroundColor: levelUpData.rank.color }]}>
                    <Text style={styles.levelUpBadgeIconBig}>{levelUpData.rank.icon}</Text>
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

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.settingsModal}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Paramètres</Text>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingsContent}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={24} color="#6366F1" />
                <Text style={styles.settingLabel}>Rappel quotidien</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(value) => updateNotificationSettings(value, notificationTime)}
                trackColor={{ false: '#3D3D3D', true: '#6366F1' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {notificationsEnabled && (
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="time" size={24} color="#9CA3AF" />
                  <Text style={styles.settingLabel}>Heure du rappel</Text>
                </View>
                <View style={styles.timePickerRow}>
                  {['07:00', '08:00', '09:00', '18:00', '19:00'].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timePill,
                        notificationTime === time && styles.timePillActive
                      ]}
                      onPress={() => updateNotificationSettings(notificationsEnabled, time)}
                    >
                      <Text style={[
                        styles.timePillText,
                        notificationTime === time && styles.timePillTextActive
                      ]}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="location" size={24} color="#10B981" />
                <Text style={styles.settingLabel}>GPS</Text>
              </View>
              <Text style={[styles.settingStatus, { color: locationPermission ? '#10B981' : '#EF4444' }]}>
                {locationPermission ? 'Activé' : 'Désactivé'}
              </Text>
            </View>

            {/* Strava Integration */}
            <View style={styles.stravaSectionDivider}>
              <Text style={styles.stravaSectionTitle}>Intégrations</Text>
            </View>

            <View style={styles.stravaSection}>
              <View style={styles.stravaHeader}>
                <View style={styles.stravaLogo}>
                  <Text style={styles.stravaLogoText}>STRAVA</Text>
                </View>
                {stravaStatus.connected && (
                  <View style={styles.stravaConnectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.stravaConnectedText}>Connecté</Text>
                  </View>
                )}
              </View>

              {stravaStatus.connected ? (
                <View style={styles.stravaConnectedContainer}>
                  <Text style={styles.stravaAthleteName}>
                    {stravaStatus.athlete_name || 'Athlète Strava'}
                  </Text>
                  
                  <View style={styles.stravaButtonsRow}>
                    <TouchableOpacity 
                      style={styles.stravaSyncButton}
                      onPress={syncStravaActivities}
                      disabled={stravaSyncing}
                    >
                      {stravaSyncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="sync" size={18} color="#FFFFFF" />
                          <Text style={styles.stravaSyncButtonText}>Synchroniser</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.stravaDisconnectButton}
                      onPress={disconnectStrava}
                    >
                      <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.stravaConnectButton}
                  onPress={connectStrava}
                  disabled={stravaConnecting}
                >
                  {stravaConnecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="link" size={20} color="#FFFFFF" />
                      <Text style={styles.stravaConnectButtonText}>Connecter Strava</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <Text style={styles.stravaDescription}>
                Importe automatiquement tes courses Strava et gagne de l'XP !
              </Text>
            </View>
          </View>
        </View>
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
    paddingBottom: 4,
  },
  appTitle: {
    fontSize: 26,
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
    marginTop: 8,
  },
  rankBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIcon: {
    fontSize: 32,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  username: {
    fontSize: 13,
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
    marginTop: 12,
  },
  levelLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 2,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -4,
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#1F1F1F',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpTextContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  xpText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  xpGainContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  xpGainText: {
    fontSize: 28,
    fontWeight: '900',
  },
  liveStatsContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 8,
  },
  liveStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  liveStat: {
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  liveStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 28,
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
    paddingVertical: 12,
  },
  actionButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2D2D2D',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingsText: {
    fontSize: 13,
    color: '#6B7280',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  questCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  questDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  questReward: {
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questXp: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  questXpLabel: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  questProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  questProgressBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#2D2D2D',
    borderRadius: 3,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  questCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  questCompletedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  trophySection: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 6,
  },
  trophyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  trophyUnlocked: {
    borderColor: '#F59E0B',
  },
  trophyLocked: {
    borderColor: '#2D2D2D',
  },
  trophyIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  trophyInfo: {
    flex: 1,
  },
  trophyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trophyDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  trophyReward: {
    marginLeft: 8,
  },
  trophyXp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  historyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyDateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  historyIntensity: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyIntensityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyXp: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '700',
  },
  levelUpBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  levelUpBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  leaderboardCardCurrentUser: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center',
  },
  leaderboardMedal: {
    fontSize: 20,
  },
  leaderboardRankText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  leaderboardBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  leaderboardBadgeIcon: {
    fontSize: 16,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  leaderboardName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  leaderboardStats: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  leaderboardXp: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
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
    padding: 20,
    width: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  intensityModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  intensityModalSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  intensityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
    gap: 8,
  },
  intensityOptionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  intensityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 12,
  },
  intensityInfoText: {
    flex: 1,
  },
  intensityRuleText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  intensityMultiplier: {
    fontSize: 14,
    fontWeight: '800',
  },
  intensityNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  sessionDetailModal: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  sessionDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  sessionDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sessionDetailContent: {
    padding: 16,
  },
  sessionDetailSection: {
    marginBottom: 20,
  },
  sessionDetailDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  sessionDetailIntensity: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sessionDetailIntensityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  sessionDetailStat: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    width: (SCREEN_WIDTH - 56) / 2,
    alignItems: 'center',
  },
  sessionDetailStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
  },
  sessionDetailStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  sessionDetailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
  },
  sessionDetailRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sessionDetailRowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionDetailCalories: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sessionDetailXp: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F59E0B',
  },
  sessionDetailLevelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  sessionDetailLevelUpText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
  },
  levelUpModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: SCREEN_WIDTH - 64,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  levelUpContent: {
    alignItems: 'center',
  },
  levelUpBadgeBig: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  levelUpBadgeIconBig: {
    fontSize: 44,
  },
  levelUpTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: 2,
  },
  levelUpRankName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  levelUpLevel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: '600',
  },
  levelUpTap: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 16,
  },
  trophyUnlockModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: SCREEN_WIDTH - 64,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  trophyUnlockTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 14,
  },
  trophyUnlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  trophyUnlockIcon: {
    fontSize: 36,
  },
  trophyUnlockName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trophyUnlockXp: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  usernameModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  usernameModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
  },
  usernameInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  usernameButtons: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  usernameCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
  },
  usernameCancelText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  usernameSave: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  usernameSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsModal: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  settingsContent: {
    padding: 16,
  },
  settingItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  timePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2D2D2D',
  },
  timePillActive: {
    backgroundColor: '#6366F1',
  },
  timePillText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  timePillTextActive: {
    color: '#FFFFFF',
  },
  // Strava styles
  stravaSectionDivider: {
    marginTop: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  stravaSectionTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stravaSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  stravaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stravaLogo: {
    backgroundColor: '#FC4C02',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stravaLogoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  stravaConnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stravaConnectedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  stravaConnectedContainer: {
    marginBottom: 8,
  },
  stravaAthleteName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  stravaButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stravaSyncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FC4C02',
    paddingVertical: 12,
    borderRadius: 10,
  },
  stravaSyncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stravaDisconnectButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  stravaConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FC4C02',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  stravaConnectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  stravaDescription: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
