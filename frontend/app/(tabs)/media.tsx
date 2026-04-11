import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

type SubTab = 'highlights' | 'twitter' | 'instagram';

const NBA_TWITTER_URL = 'https://x.com/NBA';
const NBA_INSTAGRAM_URL = 'https://www.instagram.com/nba/';

// ==================== TYPES ====================

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

// ==================== HIGHLIGHTS CONTENT ====================

const HighlightsContent = ({
  highlights,
  refreshing,
  onRefresh,
}: {
  highlights: Highlight[];
  refreshing: boolean;
  onRefresh: () => void;
}) => {
  const [selectedVideo, setSelectedVideo] = useState<Highlight | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [webViewError, setWebViewError] = useState(false);

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

  return (
    <>
      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#ffffff" />
            <View style={styles.infoBannerTextWrap}>
              <Text style={styles.infoBannerTitle}>Web Preview Mode</Text>
              <Text style={styles.infoBannerDesc}>
                Videos open in browser. In the published app, they play in-app!
              </Text>
            </View>
          </View>
        )}

        {highlights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off" size={48} color="#333333" />
            <Text style={styles.emptyText}>No highlights available</Text>
            <Text style={styles.emptySubtext}>Check back later for game highlights</Text>
          </View>
        ) : (
          highlights.map((highlight) => (
            <TouchableOpacity
              key={highlight.highlight_id}
              style={styles.highlightCard}
              onPress={() => playVideo(highlight)}
              activeOpacity={0.7}
            >
              <View style={styles.thumbnailContainer}>
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="basketball" size={40} color="#333333" />
                </View>
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={56} color="rgba(255, 255, 255, 0.9)" />
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
                  <Ionicons name="play" size={14} color="#555555" />
                  <Text style={styles.watchText}>
                    {Platform.OS === 'web' ? 'Tap to watch in browser' : 'Tap to watch'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 24 }} />
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
            <View style={styles.videoErrorContainer}>
              <Ionicons name="alert-circle" size={64} color="#ffffff" />
              <Text style={styles.videoErrorTitle}>Video Unavailable in Preview</Text>
              <Text style={styles.videoErrorText}>
                ESPN videos are restricted in preview mode.
                {'\n\n'}In the published app, videos play seamlessly!
              </Text>
              <TouchableOpacity style={styles.browserOpenButton} onPress={openInBrowser}>
                <Ionicons name="open-outline" size={20} color="#000000" />
                <Text style={styles.browserOpenText}>Open in Browser</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedVideo && (
              <WebView
                source={{ uri: selectedVideo.url }}
                style={styles.webViewFull}
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
                    <Text style={styles.loadingSubtext}>Loading ESPN...</Text>
                  </View>
                )}
              />
            )
          )}
        </View>
      </Modal>
    </>
  );
};

// ==================== SOCIAL CONTENT ====================

const SocialContent = ({ platform }: { platform: 'twitter' | 'instagram' }) => {
  const isWeb = Platform.OS === 'web';
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const currentUrl = platform === 'twitter' ? NBA_TWITTER_URL : NBA_INSTAGRAM_URL;

  const twitterLinks = [
    { label: 'NBA Official', handle: '@NBA', url: 'https://x.com/NBA', desc: 'Scores, highlights, breaking news' },
    { label: 'NBA TV', handle: '@NBATV', url: 'https://x.com/NBATV', desc: 'Programming and exclusive interviews' },
    { label: 'NBA Draft', handle: '@NBADraft', url: 'https://x.com/NBADraft', desc: 'Draft coverage and prospect rankings' },
    { label: 'NBA Stats', handle: '@NBAStats', url: 'https://x.com/nbastats', desc: 'Stats, records, and data' },
    { label: 'NBA History', handle: '@NBAHistory', url: 'https://x.com/NBAHistory', desc: 'Classic moments and milestones' },
  ];

  const instagramLinks = [
    { label: 'NBA Official', handle: '@nba', url: 'https://www.instagram.com/nba/', desc: 'Highlights, photos, stories' },
    { label: 'NBA Style', handle: '@nbastyle', url: 'https://www.instagram.com/nbastyle/', desc: 'Player fashion and fit checks' },
    { label: 'NBA Cares', handle: '@nbacares', url: 'https://www.instagram.com/nbacares/', desc: 'Community and social impact' },
    { label: 'NBA G League', handle: '@nbagleague', url: 'https://www.instagram.com/nbagleague/', desc: 'Rising stars and dev league' },
    { label: 'WNBA', handle: '@wnba', url: 'https://www.instagram.com/wnba/', desc: "Women's basketball" },
  ];

  const links = platform === 'twitter' ? twitterLinks : instagramLinks;
  const icon: any = platform === 'twitter' ? 'logo-twitter' : 'logo-instagram';

  // Web: show card links
  if (isWeb) {
    return (
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.socialWebContainer}>
          <View style={styles.infoBanner}>
            <Ionicons name="phone-portrait-outline" size={20} color="#ffffff" />
            <View style={styles.infoBannerTextWrap}>
              <Text style={styles.infoBannerTitle}>Full Feed on Mobile</Text>
              <Text style={styles.infoBannerDesc}>
                Live {platform === 'twitter' ? 'Twitter' : 'Instagram'} feed loads in-app on iOS & Android. Tap to open in browser.
              </Text>
            </View>
          </View>

          {links.map((link, i) => (
            <TouchableOpacity
              key={i}
              style={styles.accountCard}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.7}
            >
              <View style={styles.accountCardLeft}>
                <View style={styles.accountIconWrap}>
                  <Ionicons name={icon} size={20} color="#ffffff" />
                </View>
                <View style={styles.accountCardInfo}>
                  <Text style={styles.accountCardName}>{link.label}</Text>
                  <Text style={styles.accountCardHandle}>{link.handle}</Text>
                  <Text style={styles.accountCardDesc}>{link.desc}</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={16} color="#555555" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.openMainBtn}
            onPress={() => Linking.openURL(currentUrl)}
          >
            <Ionicons name={icon} size={20} color="#000000" />
            <Text style={styles.openMainText}>
              Open @{platform === 'twitter' ? 'NBA' : 'nba'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    );
  }

  // Native: WebView
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#555555" />
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <TouchableOpacity style={styles.browserOpenButton} onPress={() => Linking.openURL(currentUrl)}>
          <Ionicons name="open-outline" size={18} color="#000000" />
          <Text style={styles.browserOpenText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingSubtext}>Loading {platform === 'twitter' ? 'Twitter' : 'Instagram'}...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        key={platform}
        source={{ uri: currentUrl }}
        style={styles.webViewFull}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function MediaScreen() {
  const [activeTab, setActiveTab] = useState<SubTab>('highlights');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHighlights = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/highlights`);
      setHighlights(response.data);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoadingHighlights(false);
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

  const isLoading = activeTab === 'highlights' && loadingHighlights;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDecoRight}>
          <Ionicons name="basketball-outline" size={90} color="rgba(255,255,255,0.04)" />
        </View>
        <Text style={styles.headerTitle}>Media</Text>
        <View style={styles.headerAccent} />
        <Text style={styles.headerTagline}>Highlights & Official NBA Social</Text>
      </View>

      {/* 3-way Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'highlights' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('highlights')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="play-circle"
            size={15}
            color={activeTab === 'highlights' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'highlights' && styles.segmentTextActive]}>
            Highlights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'twitter' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('twitter')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="logo-twitter"
            size={15}
            color={activeTab === 'twitter' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'twitter' && styles.segmentTextActive]}>
            Twitter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'instagram' && styles.segmentButtonActive]}
          onPress={() => setActiveTab('instagram')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="logo-instagram"
            size={15}
            color={activeTab === 'instagram' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'instagram' && styles.segmentTextActive]}>
            Instagram
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : activeTab === 'highlights' ? (
        <HighlightsContent
          highlights={highlights}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <SocialContent platform={activeTab} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
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
    marginTop: 8,
    marginBottom: 8,
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
    paddingVertical: 11,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666666',
    marginLeft: 5,
  },
  segmentTextActive: {
    color: '#000000',
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'flex-start',
  },
  infoBannerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 17,
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
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#555555',
    marginTop: 4,
  },

  // Highlight Cards
  highlightCard: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111111',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  espnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  highlightInfo: {
    padding: 14,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
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
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchText: {
    fontSize: 12,
    color: '#555555',
    marginLeft: 6,
  },

  // Video Modal
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
    borderBottomColor: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  browserButton: {
    padding: 8,
    marginLeft: 8,
  },
  webViewFull: {
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
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  videoErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  videoErrorText: {
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

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 10,
  },
  loadingSubtext: {
    marginTop: 12,
    fontSize: 14,
    color: '#999999',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 24,
  },

  // Social Web Fallback
  socialWebContainer: {
    paddingHorizontal: 4,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  accountCardInfo: {
    flex: 1,
  },
  accountCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 1,
  },
  accountCardHandle: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
    marginBottom: 3,
  },
  accountCardDesc: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 15,
  },
  openMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
  },
  openMainText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 10,
  },
});
