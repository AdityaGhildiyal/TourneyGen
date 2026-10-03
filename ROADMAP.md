# TourneyGen — Future Vision, Architecture & Technical Roadmap

> **From a Client-Side Generator to a Full-Stack Tournament Management Platform**
> *(Powered by Next.js, Prisma ORM, and MongoDB)*

---

## 1. Executive Summary

**TourneyGen** began as an algorithmic tournament fixture scheduling system built to demonstrate graph theory, constraint satisfaction, and combinatorial optimization (Hamiltonian paths, graph coloring, priority queues, and dynamic reseeding).

This document outlines the strategic transformation of TourneyGen into a **dynamic, full-stack, cloud-native Tournament Management System (TMS)**. The platform will leverage **Prisma ORM paired with MongoDB** for flexible document-based persistence, alongside user authentication, tournament history/archives, real-time live scorekeeping, and public spectator views.

---

## 2. Why MongoDB + Prisma ORM for TourneyGen?

Tournament architectures frequently deal with deeply nested, hierarchical, and polymorphic structures (sport-specific scoring, custom constraint configs, dynamic rounds, and variable team sizes). MongoDB provides significant advantages here:

1. **Natural Document Hierarchy**: Stages, rounds, venue availability windows, and algorithm configuration can either be referenced or embedded directly as composite types (`type` in Prisma).
2. **Schema Flexibility Across Sports**: Football, basketball, cricket, and tennis have drastically different score systems (points, sets, overs, goals). A document model accommodates diverse schema requirements without complex multi-table migrations.
3. **Rapid Snapshot & History Storage**: Archiving an entire completed tournament is as simple as storing a self-contained snapshot document—eliminating the overhead of multi-table joins when viewing past tournament records.
4. **Prisma Type Safety with MongoDB**: Prisma provides full TypeScript safety, autocompletion, and validation on top of MongoDB using `@db.ObjectId` and composite models.

---

## 3. Architectural Overview

```
CURRENT (v0.1.0)                      FUTURE (v1.0.0+)
+--------------------------+          +------------------------------------------------+
|      Next.js Client      |          |               Next.js App Router               |
|   (Browser In-Memory)    |          |  (React 19 + Server Components + API Actions)  |
+------------+-------------+          +-------+--------------------+-------------------+
             |                                |                    |
             v                                v                    v
    Ephemeral State                   Auth (NextAuth/Clerk)     Prisma Client
(Lost on page reload)                         |             (MongoDB Provider)
                                              v                    |
                                      Session / JWT                v
                                                          MongoDB Atlas (Cluster)
                                                                   |
                                              +--------------------+-------------------+
                                              |                    |                   |
                                              v                    v                   v
                                         Realtime Sync       Redis Cache         Cloud Storage
                                       (WebSockets/Pusher) (Upstash RateLimit)  (S3 / Uploadthing)
```

---

## 4. Recommended Tech Stack

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, React 19) | Blends Server Components, Server Actions, and API routes within a single codebase. |
| **Database** | MongoDB (MongoDB Atlas M0 Free / Cloud) | Document-oriented database ideal for nested fixtures, bracket trees, and flexible sport configs. |
| **ORM / Data Layer** | Prisma ORM (`provider = "mongodb"`) | Type-safe queries, Prisma Studio inspection, and automated TypeScript generation. |
| **Authentication** | Auth.js (NextAuth v5) + `@auth/prisma-adapter` | Native OAuth (Google, GitHub), credentials, and session management. |
| **Real-time Sync** | Pusher / Ably / WebSockets | Instant match score updates and bracket progression broadcasts. |
| **Caching & Queuing** | Redis (Upstash) | Rate limiting, caching compute-heavy scheduling algorithms, and async tasks. |
| **Validation** | Zod | End-to-end schema validation shared across client forms and backend Server Actions. |
| **Export Engine** | `@react-pdf/renderer` & `xlsx` | Downloadable bracket sheets (PDF) and schedule rosters (Excel/CSV). |

---

## 5. Proposed Prisma Schema (`schema.prisma` for MongoDB)

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------
// Authentication Models (NextAuth / Auth.js standard)
// ----------------------------------------------------
model User {
  id            String          @id @default(auto()) @map("_id") @db.ObjectId
  name          String?
  email         String?         @unique
  emailVerified DateTime?
  image         String?
  role          UserRole        @default(ORGANIZER)
  accounts      Account[]
  sessions      Session[]
  tournaments   Tournament[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model Account {
  id                String  @id @default(auto()) @map("_id") @db.ObjectId
  userId            String  @db.ObjectId
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.String
  access_token      String? @db.String
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.String
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionToken String   @unique
  userId       String   @db.ObjectId
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum UserRole {
  ADMIN
  ORGANIZER
  REFEREE
  SPECTATOR
}

// ----------------------------------------------------
// Tournament Domain Models
// ----------------------------------------------------
enum TournamentStatus {
  DRAFT
  PUBLISHED
  ONGOING
  COMPLETED
  ARCHIVED
}

enum MatchStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  FORFEITED
  DELAYED
}

model Tournament {
  id               String           @id @default(auto()) @map("_id") @db.ObjectId
  userId           String           @db.ObjectId
  user             User             @relation(fields: [userId], references: [id])
  name             String
  slug             String           @unique
  sportType        String           // e.g. "Football", "Cricket", "Basketball", "Badminton"
  tournamentType   String           // "Knockout", "RoundRobin", "Swiss", "GroupKnockout"
  status           TournamentStatus @default(DRAFT)
  isPublic         Boolean          @default(false)
  
  startDate        DateTime?
  endDate          DateTime?

  // Algorithmic Configuration (Graph Coloring, Reseeding, Hamiltonian Path, etc.)
  algorithmOptions AlgorithmConfig?

  // Relations
  teams            Team[]
  venues           Venue[]
  fixtures         Fixture[]
  historySnapshots HistorySnapshot[]

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

// Embedded Composite Types in MongoDB
type AlgorithmConfig {
  dynamicReseeding  Boolean? @default(false)
  priorityQueue     Boolean? @default(false)
  venueScheduling   Boolean? @default(false)
  graphColoring     Boolean? @default(false)
  hamiltonianPath   Boolean? @default(false)
  avoidTopClash     Boolean? @default(false)
  matchesPerDay     Int?
  timeSlotDuration  Int?     // in minutes
}

model Team {
  id           String      @id @default(auto()) @map("_id") @db.ObjectId
  tournamentId String      @db.ObjectId
  tournament   Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  name         String
  seed         Int?
  rating       Int?
  contactEmail String?
  
  // Relations to Fixtures
  homeFixtures Fixture[]   @relation("HomeTeam")
  awayFixtures Fixture[]   @relation("AwayTeam")
}

model Venue {
  id           String      @id @default(auto()) @map("_id") @db.ObjectId
  tournamentId String      @db.ObjectId
  tournament   Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  name         String
  courtNumber  Int?
  fixtures     Fixture[]
}

model Fixture {
  id           String       @id @default(auto()) @map("_id") @db.ObjectId
  tournamentId String       @db.ObjectId
  tournament   Tournament   @relation(fields: [tournamentId], references: [id], onDelete: Cascade)

  round        Int
  matchNumber  Int
  status       MatchStatus  @default(SCHEDULED)

  teamAId      String?      @db.ObjectId
  teamA        Team?        @relation("HomeTeam", fields: [teamAId], references: [id])
  teamBId      String?      @db.ObjectId
  teamB        Team?        @relation("AwayTeam", fields: [teamBId], references: [id])

  venueId      String?      @db.ObjectId
  venue        Venue?       @relation(fields: [venueId], references: [id])

  scheduledTime DateTime?
  teamAScore   Int?         @default(0)
  teamBScore   Int?         @default(0)
  winnerId     String?      @db.ObjectId

  // Embedded Detailed Match Logs
  events       MatchEvent[]
  notes        String?

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

type MatchEvent {
  minute    Int?
  type      String       // "GOAL", "RED_CARD", "POINT", "FOUL"
  teamId    String?
  player    String?
  note      String?
}

model HistorySnapshot {
  id           String      @id @default(auto()) @map("_id") @db.ObjectId
  tournamentId String      @db.ObjectId
  tournament   Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  title        String
  snapshotData Json        // Full state snapshot for instant rollback/historical replay
  savedAt      DateTime    @default(now())
}
```

---

## 6. Core Feature Roadmap

### Phase 1: Authentication & User Accounts
- [ ] Setup NextAuth v5 with MongoDB adapter.
- [ ] Support Google OAuth & GitHub OAuth login.
- [ ] User profiles with avatar and custom tournament organizer branding.
- [ ] Role-Based Access Control (Organizers vs Referees vs Spectators).

### Phase 2: Tournament Persistence & Dynamic History
- [ ] **Save & Resume**: Save tournament setups in progress (Draft state) and re-run generators at any point without losing team/venue entries.
- [ ] **History & Archive Dashboard**:
  - View list of all active, upcoming, and past tournaments with status chips.
  - Search and filter tournaments by sport type, date, or champion.
  - Instant snapshot export/import using MongoDB documents.
- [ ] **Shareable Public Links**:
  - Clean URLs: `/tourney/[slug]` or `/t/[slug]` for public read-only views.
  - Dynamic OpenGraph preview cards for social sharing.
  - QR Code generator for posting on gymnasium/venue walls.

### Phase 3: Live Scorekeeping & Real-Time Sync
- [ ] **Referee Match Portal**:
  - Mobile-friendly interface for referees to update scores pitch-side.
  - Automatic winner determination and next-bracket progression.
- [ ] **Real-Time Bracket Updates**:
  - WebSockets or Pusher notifications broadcasting score changes instantly.
  - Live visual indicator on brackets when matches are ongoing.

### Phase 4: Algorithmic & Advanced Scheduling Features
- [ ] **Server-Side Generation**:
  - Run Hamiltonian Path, Graph Coloring, and Priority Queue scheduling via Next.js Server Actions or edge workers.
- [ ] **Dynamic Rain Delay / Conflict Rescheduling**:
  - Delay a court by 1 hour with one click and dynamically shift downstream fixtures.
- [ ] **Multi-Format Support**:
  - Double Elimination (Winners & Losers bracket).
  - Swiss System with dynamic tiebreak points (Buchholz / Sonneborn-Berger).
  - Round Robin with automatic points table generation.

### Phase 5: Export, Integrations & Notifications
- [ ] **Downloadable Assets**: Export brackets to high-resolution PDF and schedules to CSV/Excel.
- [ ] **Calendar Feeds**: iCal / Google Calendar subscribe links for players and teams.
- [ ] **Automated Alerts**: Email reminders before upcoming matches.

---

## 7. Implementation Milestones

```
Milestone 1: Database Setup & Authentication (Weeks 1-2)
├── Setup MongoDB Atlas database & connection string
├── Install Prisma CLI, configure schema.prisma with mongodb provider
├── Run `npx prisma db push` to generate MongoDB collections
├── Configure Auth.js / NextAuth v5 with @auth/prisma-adapter
└── Create Auth UI (Sign In modal, Navbar user dropdown)

Milestone 2: Tournament CRUD & Persistence (Weeks 3-4)
├── Server Actions for creating/updating tournaments
├── Connect `tournament-setup.jsx` and `customization-screen.jsx` to MongoDB
├── "My Tournaments" organizer dashboard (/dashboard)
└── Tournament Archive & History view (/tournaments/history)

Milestone 3: Live Scoring & Public Spectator Views (Weeks 5-6)
├── Public route `/t/[slug]` with dynamic metadata
├── Referee score input modal
└── Real-time sync for bracket advancement

Milestone 4: Polish & Algorithmic Rescheduling (Weeks 7+)
├── PDF and Excel schedule exports
├── Dynamic conflict rescheduling
└── Performance optimization & indexing
```

---

## 8. Immediate Setup Guide for MongoDB + Prisma

To get started with this architecture right now:

### 1. Install Prisma and MongoDB dependencies
```bash
npm install @prisma/client @auth/prisma-adapter
npm install -D prisma
```

### 2. Initialize Prisma
```bash
npx prisma init
```

### 3. Update `prisma/schema.prisma`
Set the datasource to `mongodb`:
```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

### 4. Configure MongoDB Connection in `.env`
In your `.env` or `.env.local` file:
```env
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.mongodb.net/tourneygen?retryWrites=true&w=majority"
```

### 5. Push Schema to MongoDB
Unlike relational databases that use migrations, MongoDB uses `db push`:
```bash
npx prisma db push
```

### 6. Inspect Database via Prisma Studio
```bash
npx prisma studio
```
