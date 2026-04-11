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
  Linking,
  Platform,
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
  status?: string;
}

export default function HighlightsScreen() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Highlight | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [webViewError, setWebViewError] = useState(false);

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
    setWebViewError(false);
  };

  const closeVideo = () => {
    setShowVideoModal(false);
    setWebViewError(false);
    setTimeout(() => setSelectedVideo(null), 300);
  };

  const openInBrowser = () => {
    if (selectedVideo?.url) {
      Linking.openURL(selectedVideo.url);
      closeVideo();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NBA Highlights</Text>
          <Text style={styles.headerSubtitle}>{highlights.length} videos from ESPN</Text>
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#ffffff" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Web Preview Mode</Text>
              <Text style={styles.infoDescription}>
                Videos will open in browser. In the published mobile app, videos play seamlessly in-app!
              </Text>
            </View>
          </View>
        )}

        {highlights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off" size={48} color="#666666" />
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
                  <Ionicons name="basketball" size={40} color="#ffffff" />
                </View>
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={64} color="rgba(255, 255, 255, 0.9)" />
                </View>
                <View style={styles.espnBadge}>
                  <Text style={styles.espnText}>ESPN</Text>
                </View>
              </View>

              <View style={styles.highlightInfo}>
                <Text style={styles.highlightTitle}>{highlight.title}</Text>
                {highlight.teams && (
                  <View style={styles.teamsRow}>
                    <Ionicons name="basketball-outline" size={14} color="#ffffff" />
                    <Text style={styles.teamsText}>{highlight.teams}</Text>
                  </View>
                )}
                {highlight.status && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{highlight.status}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Ionicons name="play" size={14} color="#999999" />
                  <Text style={styles.watchText}>
                    {Platform.OS === 'web' ? 'Tap to watch in browser' : 'Tap to watch highlights'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by ESPN</Text>
          <Text style={styles.footerSubtext}>
            {Platform.OS === 'web' 
              ? 'Videos open in browser (in-app on published mobile app)' 
              : 'Videos play in-app'}
          </Text>
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
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedVideo?.title}
            </Text>
            <TouchableOpacity style={styles.browserButton} onPress={openInBrowser}>
              <Ionicons name="open-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {webViewError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={64} color="#ffffff" />
              <Text style={styles.errorTitle}>Video Unavailable in Preview</Text>
              <Text style={styles.errorText}>
                ESPN videos are restricted in WebView preview mode.
                {'\n\n'}
                In the published mobile app, videos will play seamlessly!
              </Text>
              <TouchableOpacity style={styles.browserOpenButton} onPress={openInBrowser}>
                <Ionicons name="open-outline" size={20} color="#000000" />
                <Text style={styles.browserOpenText}>Open in Browser Instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedVideo && (
              <WebView
                source={{ uri: selectedVideo.url }}
                style={styles.webView}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                onError={() => setWebViewError(true)}
                onHttpError={() => setWebViewError(true)}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>Loading ESPN...</Text>
                    <Text style={styles.loadingSubtext}>
                      If this takes too long, try opening in browser
                    </Text>
                  </View>
                )}
              />
            )
          )}
        </View>
      </Modal>
    </>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 18,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  highlightCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222222',
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
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  espnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  highlightInfo: {
    padding: 16,
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
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
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#222222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchText: {
    fontSize: 13,
    color: '#999999',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#444444',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  browserButton: {
    padding: 8,
    marginLeft: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#000000',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  browserOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browserOpenText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
