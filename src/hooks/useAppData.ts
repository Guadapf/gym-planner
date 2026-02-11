import { useEffect, useState } from 'react';
import { AppConfig, HistorialEntrenamiento, Rutina, Usuario } from '../models/types';
import { StorageService } from '../storage/storageService';

interface UseAppDataResult {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => Promise<void>;
  rutinas: Rutina[];
  setRutinas: (rutinas: Rutina[]) => Promise<void>;
  config: AppConfig | null;
  setConfig: (config: AppConfig) => Promise<void>;
  historial: HistorialEntrenamiento[];
  setHistorial: (historial: HistorialEntrenamiento[]) => Promise<void>;
  cargando: boolean;
}

export function useAppData(): UseAppDataResult {
  const [usuario, setUsuarioState] = useState<Usuario | null>(null);
  const [rutinas, setRutinasState] = useState<Rutina[]>([]);
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [historial, setHistorialState] = useState<HistorialEntrenamiento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const [u, r, c, h] = await Promise.all([
        StorageService.getUsuario(),
        StorageService.getRutinas(),
        StorageService.getConfig(),
        StorageService.getHistorial(),
      ]);
      setUsuarioState(u);
      setRutinasState(r);
      setConfigState(c);
      setHistorialState(h);
      setCargando(false);
    })();
  }, []);

  async function setUsuario(usuarioNuevo: Usuario | null) {
    setUsuarioState(usuarioNuevo);
    if (usuarioNuevo) {
      await StorageService.saveUsuario(usuarioNuevo);
    } else {
      await StorageService.saveUsuario({ nombre: '' });
    }
  }

  async function setRutinas(rutinasNuevas: Rutina[]) {
    setRutinasState(rutinasNuevas);
    await StorageService.saveRutinas(rutinasNuevas);
  }

  async function setConfig(configNueva: AppConfig) {
    setConfigState(configNueva);
    await StorageService.saveConfig(configNueva);
  }

  async function setHistorial(historialNuevo: HistorialEntrenamiento[]) {
    setHistorialState(historialNuevo);
    await StorageService.saveHistorial(historialNuevo);
  }

  return {
    usuario,
    setUsuario,
    rutinas,
    setRutinas,
    config,
    setConfig,
    historial,
    setHistorial,
    cargando,
  };
}

