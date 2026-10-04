# AGENTS.md — OfertAR (Expo + React Native)

## Quick commands

```bash
npm start          # Dev server with Expo Go QR
npm run android    # Launch on Android emulator/device
npm run ios        # Launch on iOS (macOS only)
npm run web        # Launch in browser
```

Checks: `npm run typecheck` (tsc), `npm run lint` (eslint), `npm run verify` (runs every `scripts/verify*.ts` via tsx) and `npm test` (vitest, for the API layer under `src/api/__tests__`). CI (`.github/workflows/ci.yml`) runs all four on each PR. There is no formatter.

## Architecture

- **Entry**: `index.ts` → `registerRootComponent(App)` — standard Expo managed workflow.
- **Navigation**: There is **no navigation library**. All routing is a `screen` state machine in `App.tsx`. Do not add react-navigation unless explicitly asked.
- **State management**: Zustand stores in `src/store/` (`sessionStore`, `pointsStore`, `offersStore`, `scanStore`, `uiStore`; `resetAllStores()` on logout). Start-up and session effects live in `src/hooks/useAppBootstrap.ts`. `App.tsx` still owns the `screen` and the params of the current screen (compare product, selected store/reward, recovery email…) as local state, and passes what screens need as props. Stores must not import native modules (they are unit-tested with vitest in plain Node); `announcedTickets.ts` is SecureStore persistence, not a Zustand store.
- **Styling**: React Native `StyleSheet.create` + centralized tokens in `src/theme/designSystem.ts` (`colors`, `typography`). No Tailwind, no styled-components.

## Screen conventions

All screens live in `src/screens/`, one component per file. The barrel `src/screens/index.ts` re-exports every screen.

- **Named exports** are the dominant pattern (e.g. `export function HomeScreen`).
- A **few screens use default exports** (`RegisterStep1`, `RegisterStep2`). Check the file before adding imports — the barrel handles both but deduping is fragile if you add a duplicate export.
- Every screen receives callbacks as props (no navigation hooks, no global router).
- Plus Jakarta Sans is preloaded once in `App.tsx`; a screen that renders text can rely on it (no per-screen `useFonts` needed).

## Reusable components

`src/components/ui/` holds the shared components, exported via `src/components/index.ts`. Reach for these before building a screen-local version: `PrimaryButton` (the filled action button), `InlineNotice` (icon + message box), `SectionLabel`, `InputField`, `EmptyState`, `ErrorBanner`, `ScreenHeader`, `BottomNav`. Sizes, radii and spacing come from `typography`, `radii` (`radii.button` for buttons) and `space` in `src/theme/designSystem.tsx`, and so do the keyboard-focus helpers `isFocused` / `focusRing`.

## Backend

- The backend base URL lives in one place, `src/config.ts` (`API_BASE_URL`); every service and `src/constants/legal.ts` import it. To point at another environment set `EXPO_PUBLIC_API_URL`, no code edit needed.
- **API contract.** Response types come from the backend's OpenAPI (`src/api/openapi.json`, copied from the backend repo with `npm run api:sync`, types generated with `npm run api:types` into `src/api/schema.d.ts`). Every call goes through `request()` in `src/api/client.ts`, which validates the response against the zod schemas in `src/api/schemas.ts` (typed against the generated types, so a contract drift does not compile). `EXPO_PUBLIC_CONTRACT_MODE=strict` makes a mismatch throw `ApiContractError`; the default only logs it. When the backend changes a DTO: `api:sync`, `api:types`, then fix what `tsc` flags. New endpoints need a schema there.
- OCR runs on the backend: the app only uploads the ticket photos (`src/services/ticketApi.ts`, `POST /tickets/scan`) and never talks to the OCR service.
- Login and register go through the real API (`src/services/authApi.ts`). The session token is kept in `expo-secure-store` for biometric sign-in (`src/auth/biometricAuth.ts`). `Session` holds a token and a `UserProfile`.
- `src/data/` holds static data only (`plans.ts`, `rewards.ts`).

## TypeScript

`tsconfig.json` extends `expo/tsconfig.base` with `strict: true`. No path aliases configured — all imports are relative.

## Build & deploy

- EAS Build configured for Android APK previews (`eas.json`).
- `app.json` has `newArchEnabled: true`, Android edge-to-edge enabled, and `predictiveBackGestureEnabled: false`.
- The Expo project owner is `"ofertar"`, project ID `fe35e6c3-753b-4a6a-8941-2a1aecde3d69`.

## Gotchas

- `App.tsx` and `PersonalDataScreen.tsx` import `expo-file-system/legacy` for base64 reads, while `ticketApi.ts` uses the new `expo-file-system` API — be aware both are in use.
- Biometric auth gracefully degrades: `SecureStore` may throw in some environments and the app catches silently in a boot useEffect.
- Camera permission strings are duplicated in `app.json` (both the `expo-camera` plugin entry and the top-level iOS `infoPlist`).
