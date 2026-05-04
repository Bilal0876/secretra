# Secretra

> **SCHEDULE. DELEGATE. DELIVER.**

Secretra is an intelligent, AI-powered personal secretary built for busy professionals. It unifies your tasks, events, notes, and contacts into a single premium mobile experience — fully synchronized with Google Calendar in real-time.

---

## Features

### Core Productivity
- **Unified Calendar** — Personal events, team events, and tasks in one smart timeline view.
- **Task Management** — Full CRUD with priority levels, due dates, drag-to-reorder, and conflict detection.
- **Notes** — Rich text notes with tagging, pinning, archiving, and folder organization.
- **Contacts** — Manage personal and professional contacts linked to tasks and notes.

### Team & Collaboration
- **Groups** — Create workspaces for teams; share availability and events.
- **Team Calendar** — View any group member's schedule; visual conflict detection across the team.
- **Smart Invites** — Invite members by email; accept/decline with real-time UI updates.

### Google Calendar Integration
- **Bidirectional Sync** — Events created in Secretra appear instantly in Google Calendar and vice versa.
- **Incremental Engine** — Uses Google **Sync Tokens** to fetch only changed events, ensuring high-speed, low-bandwidth performance.
- **Task Sync** — Secretra tasks with due dates are pushed to Google Calendar as `[Task]` events.
- **Persistent Auth** — OAuth 2.0 with refresh token storage — stays synced in the background without re-login.
- **Manual Sync Trigger** — One-tap sync from the Settings → Integrations screen.
- **Duplicate Prevention** — Intelligent deduplication of task reflections from Google.
- **Future: Webhook Architecture** — Planned transition to Google Push Notifications (Webhooks) for instant, event-driven updates (zero-latency sync).

### Real-Time & Notifications
- **WebSockets (Socket.io)** — Calendar and task views refresh instantly across all devices when data changes; includes specialized signals like `calendarSyncComplete`.
- **Push Notifications (FCM)** — Firebase Cloud Messaging for event and task reminders.
- **Zero-Cost Scheduler (node-cron)** — Native Node.js background process for heartbeat checks and reminder delivery (no Redis required).

### Auth & Security
- **Email / Password** — bcrypt-hashed passwords, Zod-validated registration with strict password rules.
- **Google Sign-In** — Native OAuth flow with server-auth-code exchange for full Calendar API access.
- **Apple Sign-In** — Infrastructure ready (requires Apple Developer credentials to activate).
- **JWT Authentication** — Stateless, short-lived access tokens verified on every protected route.
- **Helmet** — Security headers applied to every API response.

### Settings & Personalization
- **Profile Management** — Update display name, avatar, timezone, and notification preferences.
- **Theme Toggle** — Light, dark, and system-default themes with persistent storage.
- **Integrations Panel** — Manage and trigger Google Calendar sync from one place.

---

##  Architecture

This project is a **Turborepo monorepo** with three workspaces:

```
personal-secretary/
├── shared/         # @ps/db — Prisma schema & PostgreSQL client
├── server/         # @ps/api — Express + tRPC backend
└── mobile/         # Expo React Native app
```

### Backend (`server`)
- **Express** + **tRPC** — End-to-end type-safe API with zero manual typing of endpoints.
- **Prisma** ORM over **PostgreSQL**.
- **Server-Side Sockets** for real-time push to clients.
- **node-cron** for zero-cost background job scheduling.
- **Google Calendar Service** with Incremental Sync (Sync Tokens).
- All routes protected via `protectedProcedure` tRPC middleware.
- Input validated via **Zod** schemas (centralized in `schemas/index.ts`).

### Mobile (`mobile`)
- **Expo** (React Native) + **Expo Router** (file-based navigation).
- **React Query** (TanStack) + **tRPC Client** — fully typed data fetching.
- **@gorhom/bottom-sheet** — Premium modal sheets throughout the app.
- **Expo Notifications** — Local and remote push notification handling.
- **@react-native-google-signin/google-signin** — Native Google auth.

---

##  Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local or cloud)
- Expo Go or a custom dev client

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `server/.env`:
```env
PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/secretra"
JWT_SECRET="your-strong-secret"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_ANDROID_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_REDIRECT_URI="http://localhost:4000/auth/google/callback"
```

### 3. Initialize the Database
```bash
cd shared
npx prisma db push
npx prisma generate
cd ..
```

### 4. Run the App
```bash
# Start both server and mobile together
npm run dev

# Or individually:
cd server && npm run dev          # Backend on :4000
cd mobile && npx expo start       # Expo dev client
```

### 5. Database Studio (Optional)
```bash
cd shared && npx prisma studio    # Visual DB explorer on :5555
```

---

##  Deployment

- **Mobile:** Built via [EAS Build](https://expo.dev/eas). Sensitive files (`google-services.json`) are injected via EAS Secrets.
- **Backend:** Scalable Node.js service deployed on **AWS EC2**. Secure and stable for production workloads.
- **Database:** Managed PostgreSQL via **AWS RDS**.

---

##  Key Files

| File | Purpose |
|---|---|
| `server/src/trpcBase.ts` | JWT auth middleware + context |
| `server/src/schemas/index.ts` | All Zod validation schemas |
| `server/src/services/google-calendar.service.ts` | High-performance Incremental Sync engine |
| `server/src/services/scheduler.service.ts` | Heartbeat & Background task engine |
| `server/src/controllers/calendar.ts` | Event + task calendar router (with conflict detection) |
| `shared/prisma/schema.prisma` | Full database schema |
| `mobile/app/(tabs)/` | All tab screen components |
| `mobile/app.json` | Expo app configuration |
