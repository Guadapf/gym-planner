export type UUID = string;

export interface Usuario {
  nombre: string;
}

export interface SubEjercicio {
  id: UUID;
  nombre: string;
  tipo: 'repeticiones' | 'tiempo';
  repeticiones?: number | number[]; // number for backward compat, array for variable
  duracionSegundos?: number | number[];
}

export interface Ejercicio {
  id: UUID;
  nombre: string;
  tipo: 'repeticiones' | 'tiempo' | 'superset';
  series: number;
  repeticiones?: number | number[];
  duracionSegundos?: number | number[];
  descansoEntreSeries: number; // segundos, >= 0
  ejercicios?: SubEjercicio[]; // Only for type 'superset'
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

