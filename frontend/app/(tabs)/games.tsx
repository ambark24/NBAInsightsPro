import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Game {
  game_id: string;
  home_team: string;
  away_team: string;
  date: string;
  status: string;
}

interface Prediction {
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
  prediction: Prediction | null;
}

export default function GamesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [games, setGames] = useState<GameWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/games`);
      setGames(response.data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGames();
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
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Games</Text>
        <Text style={styles.headerSubtitle}>{games.length} games with AI predictions</Text>
      </View>

      {games.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No games scheduled for today</Text>
          <Text style={styles.emptySubtext}>Check back later for predictions</Text>
        </View>
      ) : (
        games.map((item) => (
          <TouchableOpacity
            key={item.game.game_id}
            style={styles.gameCard}
            onPress={() => router.push(`/game-detail?id=${item.game.game_id}`)}
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
                    style={[
                      styles.confidenceFill,
                      { width: `${item.prediction.confidence}%` },
                    ]}
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
  header: {
    padding: 24,
    paddingTop: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999999',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  gameCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
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
    color: '#999999',
    textAlign: 'center',
    marginVertical: 4,
  },
  predictionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
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
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  pickValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  confidenceBar: {
    height: 24,
    backgroundColor: '#222222',
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
    color: '#999999',
  },
});
