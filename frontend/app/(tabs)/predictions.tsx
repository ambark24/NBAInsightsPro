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
  home_score: number;
  away_score: number;
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

interface SportsbookOdds {
  name: string;
  moneyline: { home: number; away: number };
  spread: { home_spread: number; away_spread: number; home_odds: number; away_odds: number };
  total: { line: number; over_odds: number; under_odds: number };
}

interface GameOdds {
  game_id: string;
  home_team: string;
  away_team: string;
  sportsbooks: {
    draftkings: SportsbookOdds;
    fanduel: SportsbookOdds;
    betmgm: SportsbookOdds;
  };
}

// ==================== HELPERS ====================

const getGameState = (game: Game): 'live' | 'upcoming' | 'final' => {
  const status = game.status?.toLowerCase() || '';
  // Live game indicators from balldontlie API
  if (
    status.includes('qtr') ||
    status.includes('quarter') ||
    status.includes('half') ||
    status.includes('ot') ||
    status.includes('in progress') ||
    status === 'halftime'
  ) {
    return 'live';
  }
  if (status === 'final' || status.includes('final')) {
    return 'final';
  }
  // If scores are > 0 but status is a timestamp, it might be live
  if ((game.home_score > 0 || game.away_score > 0) && !status.includes('final')) {
    return 'live';
  }
  return 'upcoming';
};

const formatGameTime = (status: string): string => {
  // If status is a datetime string, format it nicely
  try {
    const date = new Date(status);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return status;
};

const formatOdds = (odds: number): string => {
  if (odds > 0) return `+${odds}`;
  return `${odds}`;
};

// Odds Table Component
const OddsTable = ({ odds }: { odds: GameOdds }) => {
  const books = [
    { key: 'draftkings' as const, label: 'DK' },
    { key: 'fanduel' as const, label: 'FD' },
    { key: 'betmgm' as const, label: 'MGM' },
  ];

  return (
    <View style={styles.oddsSection}>
      <View style={styles.oddsDivider}>
        <View style={styles.oddsDivLine} />
        <Text style={styles.oddsDivLabel}>BETTING ODDS</Text>
        <View style={styles.oddsDivLine} />
      </View>

      {/* Header Row */}
      <View style={styles.oddsHeaderRow}>
        <View style={styles.oddsTypeCol} />
        {books.map((b) => (
          <View key={b.key} style={styles.oddsBookCol}>
            <Text style={styles.oddsBookLabel}>{b.label}</Text>
          </View>
        ))}
      </View>

      {/* Moneyline Row */}
      <View style={styles.oddsRow}>
        <View style={styles.oddsTypeCol}>
          <Text style={styles.oddsTypeText}>ML</Text>
        </View>
        {books.map((b) => {
          const ml = odds.sportsbooks[b.key].moneyline;
          return (
            <View key={b.key} style={styles.oddsBookCol}>
              <Text style={styles.oddsValueSmall}>{formatOdds(ml.home)}</Text>
              <Text style={styles.oddsValueDim}>{formatOdds(ml.away)}</Text>
            </View>
          );
        })}
      </View>

      {/* Spread Row */}
      <View style={styles.oddsRow}>
        <View style={styles.oddsTypeCol}>
          <Text style={styles.oddsTypeText}>SPR</Text>
        </View>
        {books.map((b) => {
          const sp = odds.sportsbooks[b.key].spread;
          return (
            <View key={b.key} style={styles.oddsBookCol}>
              <Text style={styles.oddsValueSmall}>
                {sp.home_spread > 0 ? '+' : ''}{sp.home_spread}
              </Text>
              <Text style={styles.oddsValueDim}>({formatOdds(sp.home_odds)})</Text>
            </View>
          );
        })}
      </View>

      {/* Total Row */}
      <View style={styles.oddsRow}>
        <View style={styles.oddsTypeCol}>
          <Text style={styles.oddsTypeText}>O/U</Text>
        </View>
        {books.map((b) => {
          const t = odds.sportsbooks[b.key].total;
          return (
            <View key={b.key} style={styles.oddsBookCol}>
              <Text style={styles.oddsValueSmall}>{t.line}</Text>
              <Text style={styles.oddsValueDim}>{formatOdds(t.over_odds)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ==================== SUB-TAB COMPONENTS ====================

const GamesContent = ({
  games,
  odds,
  refreshing,
  onRefresh,
  router,
}: {
  games: GameWithPrediction[];
  odds: Record<string, GameOdds>;
  refreshing: boolean;
  onRefresh: () => void;
  router: any;
}) => {
  // Sort: live games first, then upcoming, then final
  const sortedGames = [...games].sort((a, b) => {
    const stateOrder = { live: 0, upcoming: 1, final: 2 };
    return stateOrder[getGameState(a.game)] - stateOrder[getGameState(b.game)];
  });

  const liveCount = sortedGames.filter(g => getGameState(g.game) === 'live').length;
  const upcomingCount = sortedGames.filter(g => getGameState(g.game) === 'upcoming').length;

  return (
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
        <Text style={styles.subHeaderSubtitle}>
          {liveCount > 0 ? `${liveCount} live` : ''}{liveCount > 0 && upcomingCount > 0 ? ' · ' : ''}{upcomingCount > 0 ? `${upcomingCount} upcoming` : ''}{liveCount === 0 && upcomingCount === 0 ? `${games.length} games` : ''}
        </Text>
      </View>

      {sortedGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basketball-outline" size={48} color="#333333" />
          <Text style={styles.emptyText}>No games scheduled for today</Text>
          <Text style={styles.emptySubtext}>Check back later for predictions</Text>
        </View>
      ) : (
        sortedGames.map((item) => {
          const gameState = getGameState(item.game);
          const isLive = gameState === 'live';
          const isFinal = gameState === 'final';

          return (
            <TouchableOpacity
              key={item.game.game_id}
              style={[styles.gameCard, isLive && styles.gameCardLive]}
              onPress={() => router.push(`/game-detail?id=${item.game.game_id}`)}
              activeOpacity={0.7}
            >
              {/* Status Badge */}
              <View style={styles.statusBadgeRow}>
                {isLive ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE GAME</Text>
                  </View>
                ) : isFinal ? (
                  <View style={styles.finalBadge}>
                    <Text style={styles.finalBadgeText}>FINAL</Text>
                  </View>
                ) : (
                  <View style={styles.upcomingBadge}>
                    <Ionicons name="time-outline" size={12} color="#888888" />
                    <Text style={styles.upcomingBadgeText}>UPCOMING GAME</Text>
                  </View>
                )}
                {!isLive && !isFinal && (
                  <Text style={styles.gameTimeText}>{formatGameTime(item.game.status)}</Text>
                )}
              </View>

              {/* Live/Final: Show ACTUAL Score */}
              {(isLive || isFinal) && (
                <View style={styles.actualScoreSection}>
                  <View style={styles.scoreTeamRow}>
                    <Text style={styles.scoreTeamName}>{item.game.away_team}</Text>
                    <Text style={[styles.actualScore, isLive && styles.liveScore]}>{item.game.away_score}</Text>
                  </View>
                  <View style={styles.scoreTeamRow}>
                    <Text style={styles.scoreTeamName}>{item.game.home_team}</Text>
                    <Text style={[styles.actualScore, isLive && styles.liveScore]}>{item.game.home_score}</Text>
                  </View>
                </View>
              )}

              {/* Live/Final: Prediction underneath actual score */}
              {(isLive || isFinal) && item.prediction && (
                <View style={styles.predictionUnderScore}>
                  <View style={styles.predictionDivider}>
                    <View style={styles.predDivLine} />
                    <Text style={styles.predDivLabel}>AI PREDICTION</Text>
                    <View style={styles.predDivLine} />
                  </View>
                  <View style={styles.predScoreRow}>
                    <Text style={styles.predTeamSmall}>{item.game.away_team.split(' ').pop()}</Text>
                    <Text style={styles.predScoreSmall}>{item.prediction.predicted_away_score.toFixed(1)}</Text>
                    <Text style={styles.predDash}>-</Text>
                    <Text style={styles.predScoreSmall}>{item.prediction.predicted_home_score.toFixed(1)}</Text>
                    <Text style={styles.predTeamSmall}>{item.game.home_team.split(' ').pop()}</Text>
                  </View>
                  <View style={styles.pickRow}>
                    <View style={styles.pickBadge}>
                      <Text style={styles.pickLabel}>ML</Text>
                      <Text style={styles.pickValue}>{item.prediction.moneyline_pick.split(' ').pop()}</Text>
                    </View>
                    <View style={styles.pickBadge}>
                      <Text style={styles.pickLabel}>SPREAD</Text>
                      <Text style={styles.pickValue}>{item.prediction.spread_pick.split(' ').pop()}</Text>
                    </View>
                    <View style={styles.pickBadge}>
                      <Text style={styles.pickLabel}>TOTAL</Text>
                      <Text style={styles.pickValue}>{item.prediction.total_pick}</Text>
                    </View>
                  </View>
                  <View style={styles.confidenceBar}>
                    <View style={[styles.confidenceFill, { width: `${item.prediction.confidence}%` }]} />
                    <Text style={styles.confidenceText}>{item.prediction.confidence.toFixed(0)}% confidence</Text>
                  </View>
                </View>
              )}

              {/* Odds Table for live/final games */}
              {odds[item.game.game_id] && (
                <OddsTable odds={odds[item.game.game_id]} />
              )}

              {/* Upcoming: Show Prediction as main content */}
              {!isLive && !isFinal && (
                <>
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
                          <Text style={styles.pickLabel}>SPREAD</Text>
                          <Text style={styles.pickValue}>{item.prediction.spread_pick.split(' ')[0]}</Text>
                        </View>
                        <View style={styles.pickBadge}>
                          <Text style={styles.pickLabel}>TOTAL</Text>
                          <Text style={styles.pickValue}>{item.prediction.total_pick}</Text>
                        </View>
                      </View>
                      <View style={styles.confidenceBar}>
                        <View style={[styles.confidenceFill, { width: `${item.prediction.confidence}%` }]} />
                        <Text style={styles.confidenceText}>{item.prediction.confidence.toFixed(0)}% confidence</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noPrediction}>
                      <Text style={styles.noPredictionText}>Generating prediction...</Text>
                    </View>
                  )}

                  {/* Odds Table for upcoming games */}
                  {odds[item.game.game_id] && (
                    <OddsTable odds={odds[item.game.game_id]} />
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

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
  const [odds, setOdds] = useState<Record<string, GameOdds>>({});

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

  const fetchOdds = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/odds/all`);
      const oddsMap: Record<string, GameOdds> = {};
      response.data.forEach((o: GameOdds) => {
        oddsMap[o.game_id] = o;
      });
      setOdds(oddsMap);
    } catch (error) {
      console.error('Error fetching odds:', error);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    fetchProps();
    fetchOdds();
  }, [fetchGames, fetchProps, fetchOdds]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchGames(), fetchProps(), fetchOdds()]).finally(() => setRefreshing(false));
  }, [fetchGames, fetchProps, fetchOdds]);

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
          odds={odds}
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
  gameCardLive: {
    borderColor: '#ffffff',
    borderWidth: 1,
  },

  // Status Badges
  statusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1,
  },
  finalBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  finalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  gameTimeText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },

  // Actual Score Section (Live/Final)
  actualScoreSection: {
    marginBottom: 4,
  },
  scoreTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  scoreTeamName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  actualScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    minWidth: 50,
    textAlign: 'right',
  },
  liveScore: {
    color: '#ffffff',
  },

  // Prediction Under Score (Live/Final)
  predictionUnderScore: {
    marginTop: 12,
    paddingTop: 0,
  },
  predictionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  predDivLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1a1a',
  },
  predDivLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1.5,
    marginHorizontal: 10,
  },
  predScoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  predTeamSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777777',
    width: 70,
    textAlign: 'center',
  },
  predScoreSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999999',
    marginHorizontal: 8,
  },
  predDash: {
    fontSize: 14,
    color: '#555555',
    marginHorizontal: 4,
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

  // Odds Table
  oddsSection: {
    marginTop: 14,
    paddingTop: 0,
  },
  oddsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  oddsDivLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1a1a',
  },
  oddsDivLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1.5,
    marginHorizontal: 10,
  },
  oddsHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  oddsTypeCol: {
    width: 40,
    justifyContent: 'center',
  },
  oddsBookCol: {
    flex: 1,
    alignItems: 'center',
  },
  oddsBookLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  oddsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#111111',
  },
  oddsTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 0.5,
  },
  oddsValueSmall: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 1,
  },
  oddsValueDim: {
    fontSize: 11,
    color: '#666666',
  },
});
