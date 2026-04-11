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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

// ==================== TYPES ====================

interface Game {
  game_id: string;
  home_team: string;
  away_team: string;
  date: string;
  status: string;
}

interface GamePrediction {
  prediction_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  moneyline_pick: string;
  spread_pick: string;
  total_pick: string;
  confidence: number;
}

interface GameWithPrediction {
  game: Game;
  prediction: GamePrediction | null;
}

interface PlayerProp {
  prop_id: string;
  player_name: string;
  team: string;
  stat_type: string;
  line: number;
  prediction: string;
  projected_value: number;
  confidence: number;
  game_matchup: string;
  reasoning: string;
}

type SubTab = 'games' | 'props';

// ==================== SUB-TAB COMPONENTS ====================

const GamesContent = ({
  games,
  refreshing,
  onRefresh,
  router,
}: {
  games: GameWithPrediction[];
  refreshing: boolean;
  onRefresh: () => void;
  router: any;
}) => (
  <ScrollView
    style={styles.scrollArea}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
    }
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.subHeader}>
      <View style={styles.subHeaderDeco}>
        <Ionicons name="basketball-outline" size={70} color="rgba(255,255,255,0.04)" />
      </View>
      <Text style={styles.subHeaderTitle}>Today's Games</Text>
      <View style={styles.subHeaderAccent} />
      <Text style={styles.subHeaderSubtitle}>{games.length} games with AI predictions</Text>
    </View>

    {games.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Ionicons name="basketball-outline" size={48} color="#333333" />
        <Text style={styles.emptyText}>No games scheduled for today</Text>
        <Text style={styles.emptySubtext}>Check back later for predictions</Text>
      </View>
    ) : (
      games.map((item) => (
        <TouchableOpacity
          key={item.game.game_id}
          style={styles.gameCard}
          onPress={() => router.push(`/game-detail?id=${item.game.game_id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.gameTeams}>
            <View style={styles.teamRow}>
              <Text style={styles.teamName}>{item.game.away_team}</Text>
              {item.prediction && (
                <Text style={styles.score}>{item.prediction.predicted_away_score.toFixed(1)}</Text>
              )}
            </View>
            <Text style={styles.vs}>@</Text>
            <View style={styles.teamRow}>
              <Text style={styles.teamName}>{item.game.home_team}</Text>
              {item.prediction && (
                <Text style={styles.score}>{item.prediction.predicted_home_score.toFixed(1)}</Text>
              )}
            </View>
          </View>

          {item.prediction ? (
            <View style={styles.predictionInfo}>
              <View style={styles.pickRow}>
                <View style={styles.pickBadge}>
                  <Text style={styles.pickLabel}>ML</Text>
                  <Text style={styles.pickValue}>{item.prediction.moneyline_pick.split(' ')[0]}</Text>
                </View>
                <View style={styles.pickBadge}>
                  <Text style={styles.pickLabel}>Spread</Text>
                  <Text style={styles.pickValue}>{item.prediction.spread_pick.split(' ')[0]}</Text>
                </View>
                <View style={styles.pickBadge}>
                  <Text style={styles.pickLabel}>Total</Text>
                  <Text style={styles.pickValue}>{item.prediction.total_pick}</Text>
                </View>
              </View>
              <View style={styles.confidenceBar}>
                <View
                  style={[styles.confidenceFill, { width: `${item.prediction.confidence}%` }]}
                />
                <Text style={styles.confidenceText}>
                  {item.prediction.confidence.toFixed(0)}% confidence
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noPrediction}>
              <Text style={styles.noPredictionText}>Generating prediction...</Text>
            </View>
          )}
        </TouchableOpacity>
      ))
    )}
    <View style={{ height: 24 }} />
  </ScrollView>
);

const PropsContent = ({
  props,
  refreshing,
  onRefresh,
  filter,
  setFilter,
}: {
  props: PlayerProp[];
  refreshing: boolean;
  onRefresh: () => void;
  filter: string;
  setFilter: (f: string) => void;
}) => {
  const getStatIcon = (statType: string): any => {
    switch (statType) {
      case 'points': return 'basketball';
      case 'rebounds': return 'shuffle';
      case 'assists': return 'people';
      case 'threes': return 'radio-button-on';
      default: return 'stats-chart';
    }
  };

  const filteredProps = props.filter((prop) => {
    if (filter === 'all') return true;
    return prop.stat_type === filter;
  });

  return (
    <View style={styles.propsContainer}>
      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'points', 'rebounds', 'assists', 'threes'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filter === type && styles.filterChipActive]}
            onPress={() => setFilter(type)}
          >
            <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.propsSubHeader}>
          <Text style={styles.propsCount}>{filteredProps.length} prop bets available</Text>
        </View>

        {filteredProps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={48} color="#333333" />
            <Text style={styles.emptyText}>No props available</Text>
            <Text style={styles.emptySubtext}>Player props appear on game days</Text>
          </View>
        ) : (
          filteredProps.map((prop) => (
            <View key={prop.prop_id} style={styles.propCard}>
              <View style={styles.propHeader}>
                <View style={styles.playerInfo}>
                  <Ionicons name={getStatIcon(prop.stat_type)} size={20} color="#ffffff" />
                  <View style={styles.playerText}>
                    <Text style={styles.playerName}>{prop.player_name}</Text>
                    <Text style={styles.matchup}>{prop.game_matchup}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.propDetails}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>{prop.stat_type.toUpperCase()}</Text>
                  <Text style={styles.line}>Line: {prop.line}</Text>
                </View>

                <View style={styles.predictionRow}>
                  <View
                    style={[
                      styles.propPredBadge,
                      prop.prediction === 'Over' ? styles.overBadge : styles.underBadge,
                    ]}
                  >
                    <Text style={[styles.propPredText, prop.prediction !== 'Over' && { color: '#ffffff' }]}>
                      {prop.prediction}
                    </Text>
                    <Text style={[styles.projectedValue, prop.prediction !== 'Over' && { color: '#ffffff' }]}>
                      {prop.projected_value}
                    </Text>
                  </View>
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confLabel}>Confidence</Text>
                    <Text style={styles.confValue}>{prop.confidence.toFixed(0)}%</Text>
                  </View>
                </View>

                <Text style={styles.reasoning}>{prop.reasoning}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function PredictionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTab>('games');
  const [games, setGames] = useState<GameWithPrediction[]>([]);
  const [props, setProps] = useState<PlayerProp[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingProps, setLoadingProps] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [propsFilter, setPropsFilter] = useState('all');

  const fetchGames = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/games`);
      setGames(response.data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  const fetchProps = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/player-props`);
      setProps(response.data);
    } catch (error) {
      console.error('Error fetching props:', error);
    } finally {
      setLoadingProps(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    fetchProps();
  }, [fetchGames, fetchProps]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchGames(), fetchProps()]).finally(() => setRefreshing(false));
  }, [fetchGames, fetchProps]);

  const isLoading = activeTab === 'games' ? loadingGames : loadingProps;

  return (
    <View style={styles.container}>
      {/* Header with basketball decoration */}
      <View style={styles.header}>
        <View style={styles.headerDecoRight}>
          <Ionicons name="basketball-outline" size={90} color="rgba(255,255,255,0.04)" />
        </View>
        <Text style={styles.headerTitle}>Predictions</Text>
        <View style={styles.headerAccent} />
        <Text style={styles.headerTagline}>AI-Powered NBA Analysis</Text>
      </View>

      {/* Segmented Control Sub-Tabs */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'games' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('games')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="basketball"
            size={16}
            color={activeTab === 'games' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'games' && styles.segmentTextActive]}>
            Games
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'props' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('props')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="stats-chart"
            size={16}
            color={activeTab === 'props' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'props' && styles.segmentTextActive]}>
            Player Props
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : activeTab === 'games' ? (
        <GamesContent
          games={games}
          refreshing={refreshing}
          onRefresh={onRefresh}
          router={router}
        />
      ) : (
        <PropsContent
          props={props}
          refreshing={refreshing}
          onRefresh={onRefresh}
          filter={propsFilter}
          setFilter={setPropsFilter}
        />
      )}
    </View>
  );
}

// ==================== STYLES ====================

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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoRight: {
    position: 'absolute',
    top: -10,
    right: -15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerAccent: {
    width: 40,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    marginBottom: 6,
  },
  headerTagline: {
    fontSize: 13,
    color: '#666666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#000000',
  },

  // Scroll Area
  scrollArea: {
    flex: 1,
  },

  // Games Sub-Header
  subHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  subHeaderDeco: {
    position: 'absolute',
    top: -5,
    right: -10,
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subHeaderAccent: {
    width: 30,
    height: 2,
    backgroundColor: '#333333',
    borderRadius: 1,
    marginBottom: 6,
  },
  subHeaderSubtitle: {
    fontSize: 13,
    color: '#777777',
  },

  // Empty State
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 6,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#555555',
  },

  // Game Cards
  gameCard: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  gameTeams: {
    marginBottom: 16,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  vs: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    marginVertical: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  predictionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 16,
  },
  pickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  pickBadge: {
    alignItems: 'center',
  },
  pickLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  confidenceBar: {
    height: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  confidenceFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  confidenceText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  noPrediction: {
    padding: 16,
    alignItems: 'center',
  },
  noPredictionText: {
    fontSize: 14,
    color: '#555555',
  },

  // Props Section
  propsContainer: {
    flex: 1,
  },
  filterContainer: {
    maxHeight: 50,
    marginTop: 8,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0a0a0a',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000000',
  },
  propsSubHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  propsCount: {
    fontSize: 13,
    color: '#555555',
  },

  // Prop Cards
  propCard: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  propHeader: {
    marginBottom: 14,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerText: {
    marginLeft: 12,
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  matchup: {
    fontSize: 12,
    color: '#555555',
  },
  propDetails: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  line: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  propPredBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overBadge: {
    backgroundColor: '#ffffff',
  },
  underBadge: {
    backgroundColor: '#333333',
  },
  propPredText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
  },
  projectedValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confLabel: {
    fontSize: 11,
    color: '#555555',
    marginBottom: 2,
  },
  confValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  reasoning: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 18,
  },
});
