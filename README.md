# FinPulse Monorepo

Welcome to the **FinPulse** monorepo workspace. This repository contains both the mobile application and the web application built with modern React ecosystems.

## Repository Structure

The repository is organized into the following workspaces:

```
.
├── mobile/            # React Native & Expo mobile application
├── web/               # React Router 7 & Vite web application
└── README.md          # This file
```

---

## 📱 Mobile Application (`./mobile`)

A cross-platform mobile application targeting iOS, Android, and mobile web.

- **Tech Stack**: Expo (SDK 54), React Native, Expo Router, Tailwind CSS, Zustand, Reanimated, Skia.
- **Core Navigation**: Expo Router (file-based).
- **Getting Started**:
  ```bash
  cd mobile
  npm install
  npx expo start
  ```

For more details, see the [Mobile README](./mobile/README.md).

---

## 💻 Web Application (`./web`)

A desktop-first financial, expense, and tax tracking application.

- **Tech Stack**: React Router 7, Vite, Tailwind CSS, TanStack React Query, Zustand, Recharts.
- **Core Architecture**: Dynamic file-system based routing via custom generator config.
- **Getting Started**:
  ```bash
  cd web
  npm install
  npm run dev
  ```

For more details, see the [Web README](./web/README.md).

---

## Development Guidelines

1. **Keep projects separate**: Run dependency installations (`npm install` / `bun install`) inside their respective directories (`/mobile` or `/web`).
2. **Follow Platform Conventions**:
   - For the mobile project, leverage Expo APIs and React Native primitive components (`View`, `Text`, `StyleSheet`).
   - For the web project, use React Router conventions for loaders, actions, and standard HTML elements.
