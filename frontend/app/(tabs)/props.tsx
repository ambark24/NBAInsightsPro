import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

export default function PlayerPropsScreen() {
  const [props, setProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchProps = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/player-props`);
      setProps(response.data);
    } catch (error) {
      console.error('Error fetching player props:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProps();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProps();
  };

  const getStatIcon = (statType: string) => {
    switch (statType) {
      case 'points':
        return 'basketball';
      case 'rebounds':
        return 'shuffle';
      case 'assists':
        return 'people';
      case 'threes':
        return 'radio-button-on';
      default:
        return 'stats-chart';
    }
  };

  const filteredProps = props.filter((prop) => {
    if (filter === 'all') return true;
    return prop.stat_type === filter;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Player Props</Text>
        <Text style={styles.headerSubtitle}>{filteredProps.length} prop bets available</Text>
      </View>

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
        style={styles.propsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        {filteredProps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No props available</Text>
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
                      styles.predictionBadge,
                      prop.prediction === 'Over' ? styles.overBadge : styles.underBadge,
                    ]}
                  >
                    <Text style={styles.predictionText}>{prop.prediction}</Text>
                    <Text style={styles.projectedValue}>{prop.projected_value}</Text>
                  </View>
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>Confidence</Text>
                    <Text style={styles.confidenceValue}>{prop.confidence.toFixed(0)}%</Text>
                  </View>
                </View>

                <Text style={styles.reasoning}>{prop.reasoning}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
  filterContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 24,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000000',
  },
  propsList: {
    flex: 1,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
  propCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  propHeader: {
    marginBottom: 16,
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
    marginBottom: 4,
  },
  matchup: {
    fontSize: 12,
    color: '#999999',
  },
  propDetails: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
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
  predictionBadge: {
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
    backgroundColor: '#444444',
  },
  predictionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
  },
  projectedValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceLabel: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 2,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  reasoning: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 18,
  },
});
