export type UUID = string;

export interface Usuario {
  nombre: string;
}

export interface Ejercicio {
  id: UUID;
  nombre: string;
  tipo: 'repeticiones' | 'tiempo';
  series: number;
  repeticiones?: number;
  duracionSegundos?: number;
  descansoEntreSeries: number; // segundos, >= 0
}

export interface Rutina {
  id: UUID;
  nombre: string;
  ejercicios: Ejercicio[];
}

export interface HistorialEntrenamiento {
  id: UUID;
  fecha: string; // YYYY-MM-DD
  rutinaId: UUID | null;
  rutinaNombre: string;
  indiceRutina: number;
}

export interface AppConfig {
  cantidadRutinasActivas: number;
}

