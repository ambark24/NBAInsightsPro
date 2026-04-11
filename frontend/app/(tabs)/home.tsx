import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface GamePreview {
  game: {
    game_id: string;
    home_team: string;
    away_team: string;
    date: string;
    status: string;
  };
  prediction: {
    predicted_home_score: number;
    predicted_away_score: number;
    moneyline_pick: string;
    confidence: number;
  } | null;
}

interface PropPreview {
  prop_id: string;
  player_name: string;
  team: string;
  stat_type: string;
  line: number;
  prediction: string;
  projected_value: number;
  confidence: number;
  game_matchup: string;
}

interface HighlightPreview {
  highlight_id: string;
  title: string;
  teams: string;
  status?: string;
}

// Basketball Court Line Decoration
const CourtLine = () => (
  <View style={styles.courtLineContainer}>
    <View style={styles.courtLine} />
    <View style={styles.courtCircle}>
      <Ionicons name="basketball" size={16} color="#333333" />
    </View>
    <View style={styles.courtLine} />
  </View>
);

// Basketball Seam Decoration
const BasketballSeam = ({ style }: { style?: any }) => (
  <View style={[styles.seamContainer, style]}>
    <View style={styles.seamCurve} />
  </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [games, setGames] = useState<GamePreview[]>([]);
  const [props, setProps] = useState<PropPreview[]>([]);
  const [highlights, setHighlights] = useState<HighlightPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [gamesRes, propsRes, highlightsRes] = await Promise.allSettled([
        axios.get(`${BACKEND_URL}/api/games`),
        axios.get(`${BACKEND_URL}/api/player-props`),
        axios.get(`${BACKEND_URL}/api/highlights`),
      ]);

      if (gamesRes.status === 'fulfilled') setGames(gamesRes.value.data.slice(0, 3));
      if (propsRes.status === 'fulfilled') setProps(propsRes.value.data.slice(0, 4));
      if (highlightsRes.status === 'fulfilled') setHighlights(highlightsRes.value.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        {/* Basketball decoration top-right */}
        <View style={styles.heroDecoRight}>
          <Ionicons name="basketball-outline" size={120} color="rgba(255,255,255,0.04)" />
        </View>
        <View style={styles.heroDecoLeft}>
          <Ionicons name="basketball-outline" size={80} color="rgba(255,255,255,0.03)" />
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'Fan'}</Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroTagline}>Your AI-Powered NBA Command Center</Text>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStats}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/predictions')}>
            <View style={styles.statIconWrap}>
              <Ionicons name="basketball" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>{games.length > 0 ? games.length + '+' : '0'}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/predictions')}>
            <View style={styles.statIconWrap}>
              <Ionicons name="stats-chart" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>{props.length > 0 ? props.length + '+' : '0'}</Text>
            <Text style={styles.statLabel}>Props</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/media')}>
            <View style={styles.statIconWrap}>
              <Ionicons name="play-circle" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>{highlights.length > 0 ? highlights.length + '+' : '0'}</Text>
            <Text style={styles.statLabel}>Highlights</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/chat')}>
            <View style={styles.statIconWrap}>
              <Ionicons name="chatbubbles" size={20} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>Live</Text>
            <Text style={styles.statLabel}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CourtLine />

      {/* Games Preview Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="basketball" size={18} color="#ffffff" />
            </View>
            <Text style={styles.sectionTitle}>Today's Games</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/predictions')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {games.length === 0 ? (
          <View style={styles.emptyPreview}>
            <Ionicons name="basketball-outline" size={32} color="#333333" />
            <Text style={styles.emptyText}>No games scheduled today</Text>
            <Text style={styles.emptySubtext}>Check back when the NBA is in action</Text>
          </View>
        ) : (
          games.map((item, index) => (
            <TouchableOpacity
              key={item.game.game_id}
              style={styles.gamePreviewCard}
              onPress={() => router.push(`/game-detail?id=${item.game.game_id}`)}
            >
              <View style={styles.gamePreviewLeft}>
                <Text style={styles.gameTeamText} numberOfLines={1}>{item.game.away_team}</Text>
                <Text style={styles.gameVsText}>vs</Text>
                <Text style={styles.gameTeamText} numberOfLines={1}>{item.game.home_team}</Text>
              </View>
              {item.prediction && (
                <View style={styles.gamePreviewRight}>
                  <Text style={styles.gamePredScore}>
                    {item.prediction.predicted_away_score.toFixed(0)} - {item.prediction.predicted_home_score.toFixed(0)}
                  </Text>
                  <View style={styles.gameConfBadge}>
                    <Text style={styles.gameConfText}>{item.prediction.confidence.toFixed(0)}%</Text>
                  </View>
                </View>
              )}
              {index < games.length - 1 && <View style={styles.cardDivider} />}
            </TouchableOpacity>
          ))
        )}
      </View>

      <CourtLine />

      {/* Props Preview Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="stats-chart" size={18} color="#ffffff" />
            </View>
            <Text style={styles.sectionTitle}>Top Prop Picks</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/predictions')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {props.length === 0 ? (
          <View style={styles.emptyPreview}>
            <Ionicons name="stats-chart-outline" size={32} color="#333333" />
            <Text style={styles.emptyText}>No props available</Text>
            <Text style={styles.emptySubtext}>Player props appear on game days</Text>
          </View>
        ) : (
          <View style={styles.propsGrid}>
            {props.map((prop) => (
              <TouchableOpacity
                key={prop.prop_id}
                style={styles.propPreviewCard}
                onPress={() => router.push('/(tabs)/predictions')}
              >
                <View style={styles.propPreviewHeader}>
                  <Text style={styles.propPlayerName} numberOfLines={1}>{prop.player_name}</Text>
                  <View style={[styles.propPredBadge, prop.prediction === 'Over' ? styles.overBadge : styles.underBadge]}>
                    <Text style={styles.propPredText}>{prop.prediction}</Text>
                  </View>
                </View>
                <Text style={styles.propStatType}>{prop.stat_type.toUpperCase()}</Text>
                <View style={styles.propLineRow}>
                  <Text style={styles.propLineText}>Line: {prop.line}</Text>
                  <Text style={styles.propConfText}>{prop.confidence.toFixed(0)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <CourtLine />

      {/* Highlights Preview Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="play-circle" size={18} color="#ffffff" />
            </View>
            <Text style={styles.sectionTitle}>Latest Highlights</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/media')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {highlights.length === 0 ? (
          <View style={styles.emptyPreview}>
            <Ionicons name="videocam-outline" size={32} color="#333333" />
            <Text style={styles.emptyText}>No highlights yet</Text>
            <Text style={styles.emptySubtext}>Game highlights appear after tipoff</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsScroll}>
            {highlights.map((hl) => (
              <TouchableOpacity
                key={hl.highlight_id}
                style={styles.highlightPreviewCard}
                onPress={() => router.push('/(tabs)/media')}
              >
                <View style={styles.highlightThumb}>
                  <Ionicons name="basketball" size={28} color="#333333" />
                  <View style={styles.highlightPlayIcon}>
                    <Ionicons name="play" size={20} color="#ffffff" />
                  </View>
                </View>
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightTeams} numberOfLines={1}>{hl.teams}</Text>
                  {hl.status && <Text style={styles.highlightStatus}>{hl.status}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Bottom Branding */}
      <View style={styles.bottomBrand}>
        <View style={styles.brandRow}>
          <Ionicons name="basketball" size={20} color="#333333" />
          <Text style={styles.brandText}>NBAInsightsPro</Text>
          <Ionicons name="basketball" size={20} color="#333333" />
        </View>
        <Text style={styles.brandSub}>Powered by XGBoost ML & GPT Analysis</Text>
        <View style={styles.brandDecoLine} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecoRight: {
    position: 'absolute',
    top: -20,
    right: -30,
  },
  heroDecoLeft: {
    position: 'absolute',
    bottom: 10,
    left: -20,
  },
  heroContent: {
    marginBottom: 24,
    zIndex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  heroDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderRadius: 2,
  },
  heroTagline: {
    fontSize: 14,
    color: '#888888',
    letterSpacing: 0.5,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Court Line Decoration
  courtLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  courtLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1a1a',
  },
  courtCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },

  // Basketball Seam Decoration
  seamContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
  },
  seamCurve: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.03)',
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  viewAllText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    marginRight: 4,
  },

  // Empty Preview
  emptyPreview: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  emptyText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#555555',
    marginTop: 4,
  },

  // Game Preview Cards
  gamePreviewCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  gamePreviewLeft: {
    flex: 1,
    marginRight: 16,
  },
  gameTeamText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  gameVsText: {
    fontSize: 11,
    color: '#555555',
    marginVertical: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gamePreviewRight: {
    alignItems: 'flex-end',
  },
  gamePredScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 1,
  },
  gameConfBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gameConfText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  cardDivider: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: '#1a1a1a',
  },

  // Props Preview
  propsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  propPreviewCard: {
    width: (width - 48) / 2,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    margin: 4,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  propPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  propPlayerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  propPredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overBadge: {
    backgroundColor: '#ffffff',
  },
  underBadge: {
    backgroundColor: '#444444',
  },
  propPredText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  propStatType: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  propLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propLineText: {
    fontSize: 13,
    color: '#999999',
  },
  propConfText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Highlights Preview
  highlightsScroll: {
    paddingRight: 20,
  },
  highlightPreviewCard: {
    width: 220,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  highlightThumb: {
    height: 100,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  highlightPlayIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  highlightInfo: {
    padding: 12,
  },
  highlightTeams: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  highlightStatus: {
    fontSize: 11,
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Bottom Branding
  bottomBrand: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    marginHorizontal: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandSub: {
    fontSize: 11,
    color: '#333333',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  brandDecoLine: {
    width: 60,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
  },
});
