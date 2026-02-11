import { HistorialEntrenamiento, Rutina } from '../models/types';

export function obtenerIndiceRutinaParaHoy(
  fechaHoy: string,
  rutinas: Rutina[],
  cantidadRutinasActivas: number,
  historial: HistorialEntrenamiento[],
): number {
  if (rutinas.length === 0 || cantidadRutinasActivas <= 0) return 0;

  const activas = rutinas.slice(0, Math.min(cantidadRutinasActivas, rutinas.length));

  const ultimosEntrenos = historial
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .filter((h) => h.fecha < fechaHoy);

  if (ultimosEntrenos.length === 0) {
    return 0;
  }

  const ultimo = ultimosEntrenos[ultimosEntrenos.length - 1];
  const siguiente = (ultimo.indiceRutina + 1) % activas.length;
  return siguiente;
}

