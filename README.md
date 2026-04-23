# Personal Secretary

An Intelligent Digital Assistant Monorepo designed to manage your schedule, synchronize team availability, handle tasks, and provide real-time updates and reminders.

## 🌟 What It Does

Personal Secretary is a cross-platform application that acts as your virtual assistant. It allows you to:
- **Manage Events & Tasks:** Schedule meetings, tasks, and personal events with customizable reminders (defaults to 5 minutes prior).
- **Team Synchronization:** Check availability across your team visually, identifying scheduling conflicts using an intuitive calendar interface.
- **Real-Time Integration:** Get live updates across all devices when events change, members leave groups, or your schedule updates via WebSockets.
- **Smart Reminders:** Reliable push notifications and local reminders powered by a robust background job queue.
- **Centralized Dashboard:** See your day at a glance, accept department invites, and monitor your to-do lists seamlessly.

## 🏗️ Architecture & How It Works

This project is structured as a **Monorepo** using [Turborepo](https://turbo.build/). Turborepo provides smart build orchestration, caching, and fast local development by running the backend, mobile app, and shared packages consistently from one root directory.

### Monorepo Workspaces:

1. **`shared` (`@ps/db`)**
   - **Role:** The Model Layer. Contains the Prisma schema and the database client.
   - **Key Tech:** `prisma`, `@prisma/client`.
   - **Why it matters:** Centralizes the database logic. Both the backend and any future web projects can utilize the exact same reliable database schema and types without duplicating code.

2. **`server` (`@ps/api`)**
   - **Role:** The Controller Layer. The central nervous system of the application.
   - **Stack:** Node.js, Express, **tRPC** (for end-to-end type safety), Socket.io, BullMQ (for background jobs & reminders).
   - **Database Engine:** PostgreSQL.
   - **How it works:** Exposes secure tRPC routes consumed by the client apps. It handles JWT authentication, Google Calendar syncing, background scheduling, and pushes real-time WebSocket events.

3. **`mobile`**
   - **Role:** The View Layer (Client).
   - **Stack:** Expo (React Native), Expo Router, NativeWind (Tailwind CSS for native), tRPC Client, React Query.
   - **How it works:** A high-performance native application. It directly references the tRPC server types so that developers get autocomplete and type-checking when fetching data. It listens to socket signals to trigger dynamic UI updates (like graceful navigation on group changes) and schedules local push notifications using Expo Notifications.

## 📦 Key Libraries & Packages

- **tRPC:** Enables seamless, type-safe API communication between the Node server and the Expo app—no manual typing of API endpoint URLs or responses needed.
- **Prisma:** A modern ORM used to manage PostgreSQL easily, guaranteeing a robust TypeScript integration.
- **Expo & Expo Router:** The React Native framework and file-based routing system making mobile development and navigation clean and predictable.
- **BullMQ & ioredis:** Handles background queues running on Redis (like "send digest email" or "fire schedule reminder") ensuring high performance without blocking the main Express thread.
- **Socket.io:** Powers real-time connectivity to refresh mobile calendars the second an event is mutated on the server.

## 🚀 Getting Started & Commands

To get this project running on your local machine, ensure you have **Node.js**, **PostgreSQL**, and an **Expo** environment set up.

### Environment Setup
You'll need a `.env` configured for your database and secrets. For example:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/db_name"
JWT_SECRET="your-secret-key"
```

### Installation
Run this at the project root to install dependencies across all workspaces simultaneously:
```bash
npm install
```

### Database Initialization
Push the schema to your PostgreSQL database and generate the Prisma client (which `server` relies on):
```bash
# Inside the root folder
cd shared
npm run db:push
npm run db:generate
cd ..
```

### Available Root Commands
- **`npm run dev`**: The magic command. Starts both the Node.js server AND the Expo mobile app concurrently via Turborepo.
- **`npm run build`**: Runs the cached build pipeline across all packages (compiles TypeScript in the server and prepares packages).
- **`npm run lint`**: Checks for code formatting and standard issues across the monorepo.

### Workspace Specific Commands
If you need to run specific workspaces in isolation, you can do:
- **`cd server && npm run dev`**: Starts the `nodemon` server for backend development.
- **`cd mobile && npx expo start`**: Opens the Expo development dashboard to launch iOS/Android simulators. 
- **`cd shared && npm run db:studio`**: Opens Prisma Studio on `localhost:5555` to visually explore and edit your database tables.

---
> **Deployment Note:** For mobile deployment, the app utilizes EAS (Expo Application Services). Sensitive files like `google-services.json` are securely injected during the build pipeline via EAS Secrets, fully protecting credential exposure. The backend can be easily deployed via standard Docker containers or Node.js hosting providers, safely running the `server` package alongside the `shared` module.
