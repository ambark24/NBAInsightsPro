import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

type SocialTab = 'twitter' | 'instagram';

const NBA_TWITTER_URL = 'https://x.com/NBA';
const NBA_INSTAGRAM_URL = 'https://www.instagram.com/nba/';

// Web fallback component - shows curated links since WebView doesn't work in browser
const WebFallback = ({ activeTab }: { activeTab: SocialTab }) => {
  const twitterLinks = [
    { label: 'NBA Official', handle: '@NBA', url: 'https://x.com/NBA', desc: 'Main NBA account — scores, highlights, breaking news' },
    { label: 'NBA TV', handle: '@NBATV', url: 'https://x.com/NBATV', desc: 'NBA TV programming and exclusive interviews' },
    { label: 'NBA Draft', handle: '@NBADraft', url: 'https://x.com/NBADraft', desc: 'Draft coverage, prospect rankings, and analysis' },
    { label: 'NBA Stats', handle: '@NBAStats', url: 'https://x.com/nbastats', desc: 'Official stats, records, and data visualizations' },
    { label: 'NBA History', handle: '@NBAHistory', url: 'https://x.com/NBAHistory', desc: 'Classic moments, milestones, and throwbacks' },
  ];

  const instagramLinks = [
    { label: 'NBA Official', handle: '@nba', url: 'https://www.instagram.com/nba/', desc: 'Main NBA feed — highlights, photos, stories' },
    { label: 'NBA Style', handle: '@nbastyle', url: 'https://www.instagram.com/nbastyle/', desc: 'Player fashion, tunnel walks, and fit checks' },
    { label: 'NBA Cares', handle: '@nbacares', url: 'https://www.instagram.com/nbacares/', desc: 'Community outreach and social impact initiatives' },
    { label: 'NBA G League', handle: '@nbagleague', url: 'https://www.instagram.com/nbagleague/', desc: 'Development league highlights and rising stars' },
    { label: 'WNBA', handle: '@wnba', url: 'https://www.instagram.com/wnba/', desc: "Women's basketball highlights and news" },
  ];

  const links = activeTab === 'twitter' ? twitterLinks : instagramLinks;
  const icon = activeTab === 'twitter' ? 'logo-twitter' : 'logo-instagram';

  return (
    <ScrollView style={styles.webFallback} showsVerticalScrollIndicator={false}>
      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="phone-portrait-outline" size={20} color="#ffffff" />
        <View style={styles.infoBannerText}>
          <Text style={styles.infoBannerTitle}>Full Feed on Mobile</Text>
          <Text style={styles.infoBannerDesc}>
            The live {activeTab === 'twitter' ? 'Twitter/X' : 'Instagram'} feed loads in-app on iOS & Android via Expo Go. In web preview, tap to open directly.
          </Text>
        </View>
      </View>

      {/* Account Cards */}
      {links.map((link, index) => (
        <TouchableOpacity
          key={index}
          style={styles.accountCard}
          onPress={() => Linking.openURL(link.url)}
          activeOpacity={0.7}
        >
          <View style={styles.accountCardLeft}>
            <View style={styles.accountIconWrap}>
              <Ionicons name={icon} size={22} color="#ffffff" />
            </View>
            <View style={styles.accountCardInfo}>
              <Text style={styles.accountCardName}>{link.label}</Text>
              <Text style={styles.accountCardHandle}>{link.handle}</Text>
              <Text style={styles.accountCardDesc}>{link.desc}</Text>
            </View>
          </View>
          <Ionicons name="open-outline" size={18} color="#555555" />
        </TouchableOpacity>
      ))}

      {/* Quick Open All */}
      <TouchableOpacity
        style={styles.openMainBtn}
        onPress={() => Linking.openURL(activeTab === 'twitter' ? NBA_TWITTER_URL : NBA_INSTAGRAM_URL)}
      >
        <Ionicons name={icon} size={20} color="#000000" />
        <Text style={styles.openMainText}>
          Open @{activeTab === 'twitter' ? 'NBA' : 'nba'} in {activeTab === 'twitter' ? 'Twitter' : 'Instagram'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

// Native WebView component for mobile
const NativeWebViewContent = ({
  activeTab,
  webViewRef,
}: {
  activeTab: SocialTab;
  webViewRef: React.RefObject<WebView>;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const currentUrl = activeTab === 'twitter' ? NBA_TWITTER_URL : NBA_INSTAGRAM_URL;

  const twitterInjectedJS = `
    (function() {
      document.cookie = "night_mode=2;path=/;domain=.x.com";
      const style = document.createElement('style');
      style.textContent = \`
        [data-testid="sidebarColumn"] { display: none !important; }
        [data-testid="primaryColumn"] { max-width: 100% !important; border: none !important; }
        header[role="banner"] { display: none !important; }
        [data-testid="BottomBar"] { display: none !important; }
      \`;
      document.head.appendChild(style);
      true;
    })();
  `;

  const instagramInjectedJS = `
    (function() {
      const style = document.createElement('style');
      style.textContent = \`
        nav { display: none !important; }
        footer { display: none !important; }
        [role="banner"] { display: none !important; }
      \`;
      document.head.appendChild(style);
      true;
    })();
  `;

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#555555" />
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <Text style={styles.errorText}>
          {activeTab === 'twitter' ? 'Twitter/X' : 'Instagram'} couldn't be loaded.
          {'\n\n'}Try opening directly in your browser.
        </Text>
        <TouchableOpacity style={styles.openBrowserBtn} onPress={() => Linking.openURL(currentUrl)}>
          <Ionicons name="open-outline" size={18} color="#000000" />
          <Text style={styles.openBrowserText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>
            Loading {activeTab === 'twitter' ? 'Twitter' : 'Instagram'}...
          </Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        key={activeTab}
        source={{ uri: currentUrl }}
        style={styles.webView}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        onHttpError={(e) => { if (e.nativeEvent.statusCode >= 400) { setError(true); setLoading(false); } }}
        injectedJavaScript={activeTab === 'twitter' ? twitterInjectedJS : instagramInjectedJS}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsFullscreenVideo
        sharedCookiesEnabled
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
};

export default function MediaScreen() {
  const [activeTab, setActiveTab] = useState<SocialTab>('twitter');
  const webViewRef = useRef<WebView>(null);
  const isWeb = Platform.OS === 'web';

  const currentUrl = activeTab === 'twitter' ? NBA_TWITTER_URL : NBA_INSTAGRAM_URL;

  const handleTabSwitch = (tab: SocialTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDecoRight}>
          <Ionicons name="basketball-outline" size={90} color="rgba(255,255,255,0.04)" />
        </View>
        <Text style={styles.headerTitle}>NBA Media</Text>
        <View style={styles.headerAccent} />
        <Text style={styles.headerTagline}>Official NBA Social Feeds</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'twitter' && styles.segmentButtonActive]}
          onPress={() => handleTabSwitch('twitter')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="logo-twitter"
            size={16}
            color={activeTab === 'twitter' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'twitter' && styles.segmentTextActive]}>
            Twitter / X
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'instagram' && styles.segmentButtonActive]}
          onPress={() => handleTabSwitch('instagram')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="logo-instagram"
            size={16}
            color={activeTab === 'instagram' ? '#000000' : '#666666'}
          />
          <Text style={[styles.segmentText, activeTab === 'instagram' && styles.segmentTextActive]}>
            Instagram
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.accountInfoBar}>
          <Text style={styles.accountHandle}>
            {activeTab === 'twitter' ? '@NBA' : '@nba'}
          </Text>
          <Text style={styles.accountLabel}>Official Account</Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(currentUrl)}>
          <Ionicons name="open-outline" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Content: Web fallback or Native WebView */}
      {isWeb ? (
        <WebFallback activeTab={activeTab} />
      ) : (
        <NativeWebViewContent activeTab={activeTab} webViewRef={webViewRef} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    marginBottom: 0,
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

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  accountInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountHandle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },
  accountLabel: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '600',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },

  // Web Fallback
  webFallback: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'flex-start',
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoBannerDesc: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#333333',
  },
  accountCardInfo: {
    flex: 1,
  },
  accountCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  accountCardHandle: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '600',
    marginBottom: 4,
  },
  accountCardDesc: {
    fontSize: 12,
    color: '#555555',
    lineHeight: 16,
  },
  openMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  openMainText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 10,
  },

  // WebView (native only)
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
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
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  openBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  openBrowserText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
