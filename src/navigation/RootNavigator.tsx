import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabs } from './MainTabs';
import { RutinaEditorScreen } from '../screens/RutinaEditorScreen';
import { EntrenamientoScreen } from '../screens/EntrenamientoScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#050814',
    card: '#0b1020',
    primary: '#7C5CFF',
    text: '#ffffff',
    border: '#1e2433',
    notification: '#FF8A5C',
  },
};

export const RootNavigator = () => {
  return (
    <NavigationContainer theme={AppDarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="RutinaEditor" component={RutinaEditorScreen} />
        <Stack.Screen name="Entrenamiento" component={EntrenamientoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

