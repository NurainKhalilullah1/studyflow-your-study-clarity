# Epic: Platform

Mobile and offline infrastructure: the existing Android app, and the planned iOS port and offline mode.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| M | Android app (Capacitor) | Existing | existing |
| 5 | Offline mode | Slice 4 | planned |
| 6 | iOS app | Slice 4 | planned |

---

## Existing features

### M. Android app · existing
The React web app is wrapped as a native Android app via Capacitor 8. Uses Capacitor plugins for push notifications, Google OAuth deep links, share, splash screen, and status bar. Google Auth uses `@codetrix-studio/capacitor-google-auth`. Build: `npm run build` then `npx cap sync android && npx cap open android`.
code in `android/`, `capacitor.config.ts`, `src/App.tsx` (deep-link handler)

---

## Planned features

### 5. Offline mode · needs a decision · GA
Allow students to study without an internet connection, a critical need for Nigerian students on unreliable mobile data. Core study actions (reviewing flashcards, reading saved documents, viewing quiz history) work offline. Changes sync automatically when connectivity returns.
**Done when:** a student on an Android device with no internet can open the app, review their due flashcards, read a previously loaded document, and view their quiz history; any review actions (SM-2 ratings) queue locally and sync to Supabase when the device reconnects; the UI clearly indicates offline status.
- [ ] Design it (spec): `/architect offline mode`

### 6. iOS app · needs a decision · GA
Port the existing Android Capacitor build to iOS so students with iPhones can download from the App Store. The web codebase is shared; this is a Capacitor iOS target setup, provisioning, App Store submission, and any iOS-specific plugin configuration.
**Done when:** the app builds and runs on an iOS 16+ device via `npx cap open ios`; Google OAuth, push notifications, and deep links work on iOS; the app is submitted to TestFlight.
- [ ] Design it (spec): `/architect iOS app`
