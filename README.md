## Rutine Planner

Aplicación móvil en React Native (Expo + TypeScript) para gestionar rutinas de gimnasio rotativas, entrenamientos guiados y registro de historial.

### Arquitectura breve

- **React Native con Expo + TypeScript**.
- **Carpetas principales**:
  - `src/models`: tipos (`Usuario`, `Rutina`, `Ejercicio`, `HistorialEntrenamiento`, `AppConfig`).
  - `src/storage`: acceso a persistencia (`AsyncStorage`) y claves.
  - `src/services`: lógica de negocio (p.ej. rotación de rutinas).
  - `src/hooks`: hooks de alto nivel como `useAppData`.
  - `src/navigation`: `RootNavigator`, tabs principales y tipos de navegación.
  - `src/screens`: pantallas (`Splash`, `Login`, `Home`, `Rutinas`, `RutinaEditor`, `Entrenamiento`, `Historial`, `Configuracion`).
  - `src/components`: UI reutilizable (`ScreenContainer`, `PrimaryButton`, `Calendar`, componentes temados).
  - `assets/animations`: contiene `dumbbell.png` para la animación de splash.
  - `assets/memes`: carpeta vacía preparada para que el usuario agregue imágenes de memes.
- **Persistencia local** con `AsyncStorage`:
  - Volumen de datos pequeño y estructura simple (sin joins ni queries complejas).
  - Menor complejidad y sobrecarga que SQLite para este caso de uso.
  - Datos: usuario, rutinas, configuración (cantidad de rutinas activas) e historial.
- **Rotación de rutinas**:
  - Implementada en `rotationService.ts`.
  - Calcula la rutina de hoy según la cantidad de rutinas activas y el último entrenamiento almacenado.

### Cómo ejecutar la app

1. Instalar dependencias (ya se ejecutó `npm install` al crear el proyecto, pero podés repetir por las dudas):

```bash
npm install
```

2. Iniciar el servidor de desarrollo de Expo:

```bash
npm run start
```

3. Desde la terminal de Expo:
   - Android: presioná `a` para abrir en un emulador Android, o escaneá el QR con la app **Expo Go** en tu celular Android.
   - iOS (requiere macOS para simulador): presioná `i` o usá Expo Go en un dispositivo físico.

### Probar en un celular real

1. Instalá la app **Expo Go** desde la tienda (Google Play / App Store).
2. Asegurate de que el celular y la PC estén en la **misma red Wi-Fi**.
3. Ejecutá:

```bash
npm run start
```

4. Escaneá el QR que aparece en la terminal o en la interfaz web de Expo con Expo Go.
5. La app se abrirá en tu dispositivo real con recarga en caliente.

### Generar APK / build con EAS

1. Instalá la CLI de EAS (si aún no la tenés):

```bash
npm install -g eas-cli
```

2. Iniciá sesión o creá cuenta en Expo:

```bash
eas login
```

3. Inicializá EAS en el proyecto (solo una vez):

```bash
eas init
```

4. Configurá el proyecto Android (build tipo APK o AAB). Para un build de desarrollo:

```bash
eas build -p android --profile preview
```

5. EAS compilará la app en la nube y te dará un link para descargar el artefacto (APK/AAB).

> Nota: en `app.json` hay un campo `extra.eas.projectId` que se completa automáticamente cuando vinculás el proyecto con Expo/EAS.

