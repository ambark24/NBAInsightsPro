import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{user?.name[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>🏀 NBAInsightsPro uses advanced XGBoost machine learning algorithms combined with real-time web data to generate accurate betting predictions.</Text>
          <Text style={styles.infoText}>💡 Our predictions analyze team statistics, recent performance, and contextual information to provide moneyline, spread, and total score recommendations.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featureCard}>
          <Ionicons name="analytics" size={24} color="#ff6b35" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>ML Predictions</Text>
            <Text style={styles.featureDescription}>XGBoost-powered score predictions</Text>
          </View>
        </View>
        <View style={styles.featureCard}>
          <Ionicons name="newspaper" size={24} color="#ff6b35" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Articles</Text>
            <Text style={styles.featureDescription}>GPT-generated consensus analysis</Text>
          </View>
        </View>
        <View style={styles.featureCard}>
          <Ionicons name="chatbubbles" size={24} color="#ff6b35" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Community Chat</Text>
            <Text style={styles.featureDescription}>Discuss picks with other users</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>NBAInsightsPro v1.0</Text>
        <Text style={styles.footerText}>AI-Powered NBA Predictions</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 48,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  infoText: {
    fontSize: 14,
    color: '#c0c0c0',
    marginBottom: 12,
    lineHeight: 20,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
    alignItems: 'center',
  },
  featureContent: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#606060',
    marginBottom: 4,
  },
});
