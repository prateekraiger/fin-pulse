# FinPulse Mobile Application

A cross-platform React Native application built using **Expo SDK 54** and **Expo Router**. This application is structured to compile to iOS, Android, and mobile web.

## 🚀 Tech Stack & Core Libraries

- **Core Framework**: [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (SDK 54)
- **Routing & Navigation**: `expo-router` (declarative file-based navigation)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack React Query](https://tanstack.com/query)
- **Animations**: `moti` (powered by `react-native-reanimated`) and `@shopify/react-native-skia`
- **Styling**: Tailwind CSS via custom PostCSS & styling configs

---

## 📁 Directory Structure

```
mobile/
├── assets/            # App icons, splash screens, and local assets
├── polyfills/         # Native polyfills and custom module overrides
├── src/
│   ├── app/           # Expo Router files (+not-found, _layout, index)
│   ├── components/    # Reusable React Native components
│   └── utils/         # Helper functions and business logic
├── app.json           # Expo app configuration
├── eas.json           # EAS Build and Submission settings
├── metro.config.js    # Metro bundler config
└── package.json       # Dependencies and package scripts
```

---

## ⚡ Getting Started

### Prerequisites

Ensure you have Node.js (v18+) and standard Expo CLI prerequisites installed.

### Setup and Installation

1. Navigate to the mobile directory:

   ```bash
   cd mobile
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npx expo start
   ```

4. Run on a simulator / physical device:
   - Press **`a`** for Android Emulator.
   - Press **`i`** for iOS Simulator.
   - Press **`w`** for Web.
   - Scan the QR code with the Expo Go app on a physical device.

---

## 📝 Key Features & Guidelines

- **Responsive Layouts**: Designed mobile-first, ensuring compatibility across phone screen sizes and desktop web previews (`App.web.tsx`, `index.web.tsx`).
- **Platform Exclusives**: Always use React Native primitives (`View`, `Text`, `TouchableOpacity`) instead of raw HTML elements to ensure mobile rendering compiles.
- **Storage**: Persistent user configuration/state can be managed with `@react-native-async-storage/async-storage` or `expo-secure-store`.
