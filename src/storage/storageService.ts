import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';
import { AppConfig, HistorialEntrenamiento, Rutina, Usuario } from '../models/types';

// Justificación de AsyncStorage:
// - Volumen de datos pequeño (rutinas, usuario e historial ligero)
// - Acceso simple clave-valor, sin consultas complejas
// - Menor complejidad que SQLite y suficiente para uso offline en un solo dispositivo

async function saveObject<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  await AsyncStorage.setItem(key, json);
}

async function loadObject<T>(key: string, fallback: T): Promise<T> {
  const json = await AsyncStorage.getItem(key);
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export const StorageService = {
  getUsuario(): Promise<Usuario | null> {
    return loadObject<Usuario | null>(STORAGE_KEYS.USUARIO, null);
  },
  saveUsuario(usuario: Usuario): Promise<void> {
    return saveObject(STORAGE_KEYS.USUARIO, usuario);
  },

  getRutinas(): Promise<Rutina[]> {
    return loadObject<Rutina[]>(STORAGE_KEYS.RUTINAS, []);
  },
  saveRutinas(rutinas: Rutina[]): Promise<void> {
    return saveObject(STORAGE_KEYS.RUTINAS, rutinas);
  },

  getConfig(): Promise<AppConfig> {
    return loadObject<AppConfig>(STORAGE_KEYS.CONFIG, {
      cantidadRutinasActivas: 3,
    });
  },
  saveConfig(config: AppConfig): Promise<void> {
    return saveObject(STORAGE_KEYS.CONFIG, config);
  },

  getHistorial(): Promise<HistorialEntrenamiento[]> {
    return loadObject<HistorialEntrenamiento[]>(STORAGE_KEYS.HISTORIAL, []);
  },
  saveHistorial(historial: HistorialEntrenamiento[]): Promise<void> {
    return saveObject(STORAGE_KEYS.HISTORIAL, historial);
  },
};

