import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Highlight {
  highlight_id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  game_id: string;
  teams: string;
  date: string;
  duration?: number;
}

export default function HighlightsScreen() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHighlights = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/highlights`);
      setHighlights(response.data);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHighlights();
  };

  const openVideo = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff6b35" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NBA Highlights</Text>
        <Text style={styles.headerSubtitle}>{highlights.length} videos from ESPN</Text>
      </View>

      {highlights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off" size={48} color="#606060" />
          <Text style={styles.emptyText}>No highlights available</Text>
          <Text style={styles.emptySubtext}>Check back later for game highlights</Text>
        </View>
      ) : (
        highlights.map((highlight) => (
          <TouchableOpacity
            key={highlight.highlight_id}
            style={styles.highlightCard}
            onPress={() => openVideo(highlight.url)}
          >
            {highlight.thumbnail ? (
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: highlight.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={56} color="rgba(255, 255, 255, 0.9)" />
                </View>
                {highlight.duration && highlight.duration > 0 && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{formatDuration(highlight.duration)}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noThumbnail}>
                <Ionicons name="videocam" size={40} color="#606060" />
              </View>
            )}

            <View style={styles.highlightInfo}>
              <Text style={styles.highlightTitle}>{highlight.title}</Text>
              {highlight.teams && (
                <View style={styles.teamsRow}>
                  <Ionicons name="basketball-outline" size={14} color="#ff6b35" />
                  <Text style={styles.teamsText}>{highlight.teams}</Text>
                </View>
              )}
              {highlight.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {highlight.description}
                </Text>
              )}
              <View style={styles.metaRow}>
                <Ionicons name="logo-espn" size={16} color="#a0a0a0" />
                <Text style={styles.source}>ESPN</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by ESPN</Text>
        <Text style={styles.footerSubtext}>Videos open in browser</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
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
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  highlightCard: {
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightInfo: {
    padding: 16,
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 24,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamsText: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
    marginLeft: 6,
  },
  description: {
    fontSize: 14,
    color: '#c0c0c0',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    fontSize: 12,
    color: '#a0a0a0',
    marginLeft: 6,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#808080',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#606060',
  },
});
