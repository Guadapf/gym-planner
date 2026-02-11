import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { RutinasScreen } from '../screens/RutinasScreen';
import { HistorialScreen } from '../screens/HistorialScreen';
import { ConfiguracionScreen } from '../screens/ConfiguracionScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0b1020',
          borderTopColor: '#1e2433',
        },
        tabBarActiveTintColor: '#7C5CFF',
        tabBarInactiveTintColor: '#9a9fb5',
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = 'home';
          if (route.name === 'Rutinas') iconName = 'barbell';
          if (route.name === 'Historial') iconName = 'calendar';
          if (route.name === 'Configuracion') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" options={{ title: 'Inicio' }} component={HomeScreen} />
      <Tab.Screen name="Rutinas" options={{ title: 'Rutinas' }} component={RutinasScreen} />
      <Tab.Screen name="Historial" options={{ title: 'Historial' }} component={HistorialScreen} />
      <Tab.Screen
        name="Configuracion"
        options={{ title: 'Config' }}
        component={ConfiguracionScreen}
      />
    </Tab.Navigator>
  );
};

