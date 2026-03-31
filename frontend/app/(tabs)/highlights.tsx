import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

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
  const [selectedVideo, setSelectedVideo] = useState<Highlight | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

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

  const playVideo = (highlight: Highlight) => {
    setSelectedVideo(highlight);
    setShowVideoModal(true);
  };

  const closeVideo = () => {
    setShowVideoModal(false);
    setTimeout(() => setSelectedVideo(null), 300);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <>
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
              onPress={() => playVideo(highlight)}
            >
              <View style={styles.thumbnailContainer}>
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="basketball" size={40} color="#ff6b35" />
                </View>
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={64} color="rgba(255, 107, 53, 0.9)" />
                </View>
                <View style={styles.espnBadge}>
                  <Text style={styles.espnText}>ESPN</Text>
                </View>
              </View>

              <View style={styles.highlightInfo}>
                <Text style={styles.highlightTitle}>{highlight.title}</Text>
                {highlight.teams && (
                  <View style={styles.teamsRow}>
                    <Ionicons name="basketball-outline" size={14} color="#ff6b35" />
                    <Text style={styles.teamsText}>{highlight.teams}</Text>
                  </View>
                )}
                {highlight.status && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{highlight.status}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Ionicons name="play" size={14} color="#a0a0a0" />
                  <Text style={styles.watchText}>Tap to watch highlights</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by ESPN</Text>
          <Text style={styles.footerSubtext}>Videos play in-app</Text>
        </View>
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        onRequestClose={closeVideo}
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeVideo}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedVideo?.title}
            </Text>
          </View>
          
          {selectedVideo && (
            <WebView
              source={{ uri: selectedVideo.url }}
              style={styles.webView}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color="#ff6b35" />
                  <Text style={styles.loadingText}>Loading ESPN...</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </>
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
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  espnBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  espnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f3460',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchText: {
    fontSize: 13,
    color: '#a0a0a0',
    marginLeft: 6,
    fontStyle: 'italic',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});
