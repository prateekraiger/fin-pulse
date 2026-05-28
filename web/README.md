# FinPulse Web Application

A desktop-first web application built on **React Router 7**, **Vite**, and **Tailwind CSS**. It is primarily focused on serving as a financial, expense, tax management, and compliance dashboard.

## 🚀 Tech Stack & Core Libraries

* **Core Framework**: [React Router 7](https://reactrouter.com/) (using Vite bundler integrations)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Styling**: Tailwind CSS
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Data Fetching**: [TanStack React Query](https://tanstack.com/query)
* **Data Visualization**: [Recharts](https://recharts.org/)
* **Testing**: [Vitest](https://vitest.dev/)

---

## 📁 Directory Structure

```
web/
├── src/
│   ├── app/                 # Routes, pages, and API setups
│   │   ├── api/             # Internal/mock API endpoints
│   │   ├── dashboard/       # Main overview dashboard
│   │   ├── expenses/        # Expense tracking and categorization
│   │   ├── income/          # Income tracking
│   │   ├── invoices/        # Invoice creation and management
│   │   ├── tax/             # Tax calculation tools
│   │   ├── compliance/      # Regulatory compliance checks
│   │   ├── onboarding/      # User onboarding flows
│   │   ├── root.tsx         # App wrapper, stylesheets, and base shell
│   │   └── routes.ts        # Dynamic filesystem route builder
│   ├── components/          # Reusable React UI components
│   ├── lib/                 # Core libraries and third-party setups
│   └── utils/               # Formatting, calculation, and string utilities
├── vite.config.ts           # Vite configurations & plugins
├── react-router.config.ts   # React Router configurations
├── vitest.config.ts         # Vitest unit/integration testing configurations
└── package.json             # Scripts and npm dependencies
```

---

## ⚡ Getting Started

### Prerequisites

Ensure you have Node.js (v18+) installed.

### Setup and Installation

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the Vite development server:
   ```bash
   npm run dev
   ```

4. Perform type-checking and type generation:
   ```bash
   npm run typecheck
   ```

---

## 🧭 Routing System

This project implements dynamic route generation. Instead of manually registering every route in a central file, `src/app/routes.ts` crawls the `src/app` directory tree at build time and automatically registers any `page.jsx` file as an active route.

* Dynamic parameters (e.g., `:id`) are designated by folder names with square brackets: `[id]`.
* Catch-all parameters are denoted with triple dots: `[...ids]`.
