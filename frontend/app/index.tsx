import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, loginAsGuest } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      router.replace('/(tabs)/games');
    }
  }, [user, loading, router]);

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = `${BACKEND_URL}/`;
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    router.replace('/(tabs)/games');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/basketball-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>NBAInsightsPro</Text>
        <Text style={styles.subtitle}>AI-Powered NBA Betting Predictions</Text>
        
        <View style={styles.features}>
          <Text style={styles.feature}>📊 XGBoost ML Predictions</Text>
          <Text style={styles.feature}>💰 Moneyline, Spread & Total</Text>
          <Text style={styles.feature}>📝 AI Consensus Articles</Text>
          <Text style={styles.feature}>💬 Community Chat</Text>
        </View>

        <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
        
        <Text style={styles.guestNote}>Guest mode: Full access to predictions & articles</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 48,
    textAlign: 'center',
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestButton: {
    backgroundColor: '#16213e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 250,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  guestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 250,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestNote: {
    fontSize: 12,
    color: '#808080',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
  },
});
