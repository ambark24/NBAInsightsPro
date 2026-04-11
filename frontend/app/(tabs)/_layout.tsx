import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

const tabBarIconGames = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="basketball" size={size} color={color} />
);

const tabBarIconProps = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="stats-chart" size={size} color={color} />
);

const tabBarIconHighlights = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="play-circle" size={size} color={color} />
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
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#333333',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#ffffff',
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
        name="props"
        options={{
          title: 'Props',
          tabBarIcon: tabBarIconProps,
        }}
      />
      <Tabs.Screen
        name="highlights"
        options={{
          title: 'Highlights',
          tabBarIcon: tabBarIconHighlights,
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
