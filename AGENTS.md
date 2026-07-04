# AGENTS.md — OfertAR (Expo + React Native)

## Quick commands

```bash
npm start          # Dev server with Expo Go QR
npm run android    # Launch on Android emulator/device
npm run ios        # Launch on iOS (macOS only)
npm run web        # Launch in browser
```

No `lint`, `test`, `typecheck`, or `format` scripts are defined. ESLint config exists but must be run manually via `npx eslint .`.

## Architecture

- **Entry**: `index.ts` → `registerRootComponent(App)` — standard Expo managed workflow.
- **Navigation**: There is **no navigation library**. All routing is a `screen` state machine in `App.tsx`. The `src/navigation/` dir is a placeholder (empty barrel). Do not add react-navigation unless explicitly asked.
- **State management**: None. The `src/store/` dir is a placeholder. All state lives in `App.tsx` useState hooks and is passed down as props.
- **Styling**: React Native `StyleSheet.create` + centralized tokens in `src/theme/designSystem.ts` (`colors`, `typography`). No Tailwind, no styled-components.

## Screen conventions

All screens live in `src/screens/`, one component per file. The barrel `src/screens/index.ts` re-exports every screen.

- **Named exports** are the dominant pattern (e.g. `export function HomeScreen`).
- A **few screens use default exports** (`RegisterStep1`, `RegisterStep2`). Check the file before adding imports — the barrel handles both but deduping is fragile if you add a duplicate export.
- Every screen receives callbacks as props (no navigation hooks, no global router).
- Screens that show text content must load Plus Jakarta Sans via `useFonts` inline (the font is not loaded globally).

## Reusable components

`src/components/ui/` contains 5 shared components: `BottomNav`, `InputField`, `LoadingOverlay`, `PasswordStrengthBar`, `Toast`. Exported via `src/components/index.ts`.

## Backend

- OCR API base URL is hardcoded in `src/services/api.ts` (`BASE_URL`).
- Auth uses a hardcoded `admin/changeme` login to get a bearer token for OCR requests.
- Mock data for offers, rewards, and tracked products lives in `src/data/`.
- App auth (`src/auth/`) consists of mock user data + biometric helpers via `expo-secure-store` / `expo-local-authentication`. `Session` type includes a token and a `UserProfile`.

## TypeScript

`tsconfig.json` extends `expo/tsconfig.base` with `strict: true`. No path aliases configured — all imports are relative.

## Build & deploy

- EAS Build configured for Android APK previews (`eas.json`).
- `app.json` has `newArchEnabled: true`, Android edge-to-edge enabled, and `predictiveBackGestureEnabled: false`.
- The Expo project owner is `"ofertar"`, project ID `fe35e6c3-753b-4a6a-8941-2a1aecde3d69`.

## Gotchas

- `src/services/api.ts` imports `expo-file-system/legacy` in `App.tsx` for base64 reads — be aware the project uses the legacy FileSystem API.
- Biometric auth gracefully degrades: `SecureStore` may throw in some environments and the app catches silently in a boot useEffect.
- Camera permission strings are duplicated in `app.json` (both the `expo-camera` plugin entry and the top-level iOS `infoPlist`).
