# Numbies

A better payments app powered by Tempo.

## Tech Stack

- **Framework**: One (React Native + Web via Vite, not Metro)
- **UI**: Tamagui
- **Database**: Convex (real-time)
- **Auth**: Privy (SMS login)
- **Payments**: Tempo, Superset
- **Blockchain**: viem

## Package Manager

**Always use `bun`** for package management. Never use npm or yarn.

## Commands

```bash
bun install          # Install dependencies
bun add <package>    # Add a package
bunx expo install <package>  # Add Expo packages (ensures version compatibility)
bun dev              # Web dev server
bun dev:clean        # Web dev server (clean start)
bun ios              # iOS simulator (auto-rebuilds if needed)
bun ios:rebuild      # iOS simulator (force rebuild)
bun ios:device       # iOS physical device (debug)
bun ios:device:release  # iOS physical device (release)
bun android          # Android dev
bun build            # Production web build
bun serve            # Serve production build locally
bun clean            # Clean build artifacts
bun typecheck        # Type check
bunx biome check .   # Lint
bunx biome check . --write  # Lint and auto-fix
bunx convex dev      # Convex dev server
```

## Structure

- `src/` - App source (UI, auth, blockchain, hooks)
- `convex/` - Backend (schema, queries, mutations)
- `app/` - Routes and layouts
- `config/` - Tamagui theme

## Key Config: Vite + Convex

One uses Vite (not Metro) for native builds. Some packages need explicit ESM resolution in `vite.config.ts`:

```typescript
// Required for iOS - forces ESM resolution
{ find: /^convex\/react$/, replacement: convexReactPath },
{ find: /^convex$/, replacement: convexPath },
```

**If iOS crashes with `useQueries is not a function`**, check these aliases exist.

## Environment

- `EXPO_PUBLIC_CONVEX_URL` - Convex deployment URL
- `EXPO_PUBLIC_PRIVY_APP_ID` - Privy app ID
- `WEB_PUBLIC_PRIVY_CLIENT_ID` - Privy web client ID
- `EXPO_PUBLIC_PRIVY_CLIENT_ID` - Privy native client ID
- `EXPO_PUBLIC_EAS_PROJECT_ID` - EAS project ID (for OTA updates)

## Deployment

### OTA Updates (JS-only changes)

For JavaScript/TypeScript changes that don't touch native code:

```bash
bun run update --message "description of changes"
```

This pushes updates instantly to all installed apps without requiring a new TestFlight build. Users will get the update next time they open the app.

### Native Builds (TestFlight)

For changes that require a native rebuild (new native modules, app.config.ts changes, etc.):

```bash
bun run ios:testflight
```

This will:
1. Run `one prebuild` to generate native code from Expo config
2. Build a release archive via Xcode
3. Upload directly to App Store Connect

After upload, check App Store Connect - processing takes 5-15 minutes, then the build appears in TestFlight.

**Note:** EAS Build doesn't work with One (Vite-based bundling). Use local Xcode builds instead.

### When to use which?

| Change Type | Command |
|-------------|---------|
| UI tweaks, bug fixes, new screens | `bun run update` |
| New npm package with native code | `bun run ios:testflight` |
| Changes to app.config.ts | `bun run ios:testflight` |
| Expo SDK upgrade | `bun run ios:testflight` |

### Web Deployment

Web deploys automatically via Vercel when pushing to main.
