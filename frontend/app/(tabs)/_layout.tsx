import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

const tabBarIconGames = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="basketball" size={size} color={color} />
);

const tabBarIconChat = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="chatbubbles" size={size} color={color} />
);

const tabBarIconProfile = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="person" size={size} color={color} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ff6b35',
        tabBarInactiveTintColor: '#808080',
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#0f3460',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#16213e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: tabBarIconGames,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: tabBarIconChat,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabBarIconProfile,
        }}
      />
    </Tabs>
  );
}
