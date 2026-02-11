import type { Rutina } from '../models/types';

export type MainTabParamList = {
  Home: undefined;
  Rutinas: undefined;
  Historial: undefined;
  Configuracion: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: { screen?: keyof MainTabParamList } | undefined;
  RutinaEditor: { rutinaId?: string } | undefined;
  Entrenamiento: { rutinaId: string; indiceRutina: number };
};

export interface EntrenamientoParams {
  rutinaId: string;
  indiceRutina: number;
  rutina?: Rutina;
}

