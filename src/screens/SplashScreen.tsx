import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SplashScreenNative from 'expo-splash-screen';
import { RootStackParamList } from '../navigation/types';
import { View } from '../components/Themed';
import { useAppData } from '../hooks/useAppData';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const TIEMPO_MINIMO_SPLASH_MS = 1200;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const { usuario, cargando } = useAppData();
  const splashOculto = useRef(false);

  // Ocultar la splash nativa cuando esta pantalla esté montada para ver la animación React
  useEffect(() => {
    if (splashOculto.current) return;
    splashOculto.current = true;
    SplashScreenNative.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const loopAnimation = () => {
      rotation.setValue(0);
      translateY.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: -1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -10,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        loopAnimation();
      });
    };

    loopAnimation();
  }, [rotation, translateY]);

  useEffect(() => {
    if (!cargando) {
      const timeout = setTimeout(() => {
        if (usuario && usuario.nombre.trim().length > 0) {
          navigation.replace('Main');
        } else {
          navigation.replace('Login');
        }
      }, TIEMPO_MINIMO_SPLASH_MS);
      return () => clearTimeout(timeout);
    }
  }, [cargando, usuario, navigation]);

  const rotate = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dumbbellContainer,
          {
            transform: [{ rotate }, { translateY }],
          },
        ]}
      >
        <Image
          source={require('../../assets/animations/dumbbell.png')}
          style={styles.dumbbell}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dumbbellContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dumbbell: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
});

