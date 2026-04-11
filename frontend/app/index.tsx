import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
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
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin + '/' : '/';
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
    <ImageBackground
      source={require('../assets/basketball-bg.png')}
      style={styles.background}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.title}>NBAInsightsPro</Text>
        <Text style={styles.subtitle}>AI-Powered NBA Betting Predictions</Text>
        
        <View style={styles.features}>
          <Text style={styles.feature}>XGBoost ML Predictions</Text>
          <Text style={styles.feature}>Moneyline, Spread & Total</Text>
          <Text style={styles.feature}>AI Consensus Articles</Text>
          <Text style={styles.feature}>Community Chat</Text>
        </View>

        <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
        
        <Text style={styles.guestNote}>Guest mode: Full access to predictions & articles</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  backgroundImage: {
    opacity: 0.15,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#cccccc',
    marginBottom: 60,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  features: {
    marginBottom: 60,
  },
  feature: {
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  guestButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    minWidth: 280,
    marginBottom: 20,
  },
  guestButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    minWidth: 280,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  guestNote: {
    fontSize: 13,
    color: '#999999',
    marginTop: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
  },
});
