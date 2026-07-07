# @crm/db

Database package for the CRM application using Prisma ORM.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up your database connection string in a `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm?schema=public"
```

3. Generate Prisma Client:
```bash
bun run db:generate
```

## Usage

Import the Prisma client in your application:

```typescript
import { prisma } from "@crm/db";

// Use prisma to query your database
const users = await prisma.user.findMany();
```

## Available Scripts

- `bun run db:generate` - Generate Prisma Client
- `bun run db:push` - Push schema changes to database (development)
- `bun run db:migrate` - Create and apply migrations
- `bun run db:studio` - Open Prisma Studio (database GUI)

## Schema

The Prisma schema is located in `prisma/schema.prisma`. Edit this file to define your database models.
