# CRM Application

A Customer Relationship Management system for managing leads, clients, deals, tasks, and meetings.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Express.js with Bun runtime
- **Database**: PostgreSQL (Neon), Prisma ORM
- **Storage**: AWS S3
- **Monorepo**: Turborepo

## Prerequisites

- Bun >= 1.2.17
- Node.js >= 18
- PostgreSQL database
- AWS S3 bucket
- Google Cloud Project (for Calendar integration)

## Quick Start

### 1. Install Dependencies
bun install

### 2. Environment Setup

**`packages/db/.env`**
```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

**`apps/api/.env`**
```env
DATABASE_URL="your-database-url"
JWT_SECRET="your-secret-key"
AWS_REGION="your-region"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
S3_BUCKET_NAME="your-bucket"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3001/auth/google/callback"
PORT=3001
```

**`apps/frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Database Setup

```bash
cd packages/db
bunx prisma migrate dev
bunx prisma generate
```

### 4. Start Development

```bash
# From root - starts both frontend and backend
bun dev

# Or individually:
cd apps/api && bun dev       # Backend: http://localhost:3001
cd apps/frontend && bun dev  # Frontend: http://localhost:3000
```

### 5. Initial Setup

- Navigate to `http://localhost:3000/setup`
- Create admin account
- Start using the CRM

## Available Scripts

```bash
bun dev              # Start development servers
bun build            # Build for production
bun lint             # Lint all packages
```

## User Roles

- **ADMIN**: Full access, manage users, view archived leads
- **MANAGER**: Manage all leads/clients/deals, archive leads
- **EMPLOYEE**: Manage own leads only, limited access

## Features

- Lead management with kanban board
- Client and deal tracking
- Task management
- Meeting scheduler with Google Calendar sync
- Document management with S3
- Role-based permissions
- Archive functionality

## Project Structure

```
CRM/
├── apps/
│   ├── api/          # Express backend
│   └── frontend/     # Next.js frontend
└── packages/
    ├── db/           # Prisma schema
    ├── zod/          # Validation schemas
    └── ui/           # Shared components
```

