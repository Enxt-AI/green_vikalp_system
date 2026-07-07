# CRM Finance - Developer Guide

## 📚 Table of Contents
- [Architecture Overview](#architecture-overview)
- [Key Concepts](#key-concepts)
- [Authentication & Authorization](#authentication--authorization)
- [Pipeline & Campaign System](#pipeline--campaign-system)
- [Lead Management](#lead-management)
- [Data Flow](#data-flow)
- [Common Patterns](#common-patterns)
- [Important Business Logic](#important-business-logic)

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (via Neon), Prisma ORM
- **Authentication**: JWT with HTTP-only cookies
- **Monorepo**: Turborepo with shared packages

### Project Structure
```
apps/
  ├── api/              # Express backend
  │   ├── routes/       # API endpoints
  │   ├── middleware/   # Auth, validation
  │   └── lib/          # Utilities (JWT, password, S3)
  └── frontend/         # Next.js frontend
      ├── app/          # Pages (App Router)
      ├── components/   # React components
      └── lib/          # API client, auth context
packages/
  ├── db/               # Prisma schema & migrations
  ├── zod/              # Shared validation schemas
  └── ui/               # Shared UI components
```

---

## 🔑 Key Concepts

### Role-Based Access Control (RBAC)

**Role Hierarchy:**
```
ADMIN > MANAGER > EMPLOYEE
```

**Access Levels:**
- **ADMIN**: Full system access, user management, all campaigns
- **MANAGER**: Campaign/pipeline creation, assigned campaigns
- **EMPLOYEE**: Only assigned campaigns, own leads

**Implementation:**
```typescript
// Middleware chain
router.post('/campaigns', 
  authenticate,                          // Verify JWT
  requireRole('ADMIN', 'MANAGER'),      // Check role
  handler                                // Execute
);
```

### Pipeline System

**What is a Pipeline?**
A pipeline is a sequence of stages that leads move through during the sales process.

**Stage Types:**
1. **Active Stages**: Regular sales stages (e.g., "New Lead", "Qualified", "Proposal")
2. **Final Stages**: Deal outcomes (Closed Won, Closed Lost)
   - Marked with `isFinal: true`
   - Automatically added to every pipeline
   - Cannot be deleted

**Key Properties:**
```typescript
PipelineStage {
  id: string
  name: string
  color: string        // Hex color for UI
  order: number        // Display order (0-indexed)
  isFinal: boolean     // True for Closed Won/Lost
  isDefault: boolean   // True for first stage
}
```

---

## 🔐 Authentication & Authorization

### JWT Flow

**Login Process:**
```
1. User submits username/password
2. Backend verifies password with bcrypt
3. Backend creates JWT with user data
4. JWT stored in HTTP-only cookie
5. Cookie sent with all requests
6. Middleware verifies JWT on each request
```

**Token Payload:**
```typescript
{
  userId: string,      // User UUID
  username: string,    // Username
  role: Role          // ADMIN | MANAGER | EMPLOYEE
}
```

**Security Features:**
- HTTP-only cookies (prevents XSS)
- Secure flag in production (HTTPS only)
- 7-day expiration
- bcrypt password hashing (12 salt rounds)

### Access Control Pattern

**Campaign Access:**
```typescript
// Helper function checks:
// - ADMIN/MANAGER: Always has access
// - EMPLOYEE: Only if in assignedToIds array
const hasAccess = await checkCampaignAccess(campaignId, userId, userRole);
if (!hasAccess) {
  return res.status(403).json({ error: "Access denied" });
}
```

---

## 📊 Pipeline & Campaign System

### Pipeline Creation

**Automatic Final Stages:**
When creating a pipeline, the system AUTOMATICALLY adds Closed Won/Lost:

```typescript
// User creates: ["New Lead", "Qualified", "Proposal"]
// System creates: 
[
  { name: "New Lead", order: 0, isFinal: false },
  { name: "Qualified", order: 1, isFinal: false },
  { name: "Proposal", order: 2, isFinal: false },
  { name: "Closed Won", order: 3, isFinal: true, color: "#16a34a" },
  { name: "Closed Lost", order: 4, isFinal: true, color: "#dc2626" }
]
```

**Why This Matters:**
- Ensures consistent deal outcome tracking
- Enables accurate win rate calculations
- Standardizes reporting across all campaigns

### Campaign Structure

**Campaign Components:**
```typescript
Campaign {
  id: string
  name: string
  description: string
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "DRAFT" | "ARCHIVED"
  pipelineId: string           // Links to pipeline
  assignedToIds: string[]      // Users who can access
  budget: Decimal?
  targetAmount: Decimal?
  startDate: DateTime
  endDate: DateTime?
}
```

---

## 🎯 Lead Management

### Lead States

**1. Active Lead:**
- `isArchived: false`
- In a non-final stage
- Visible in Kanban board
- Counted in "Active Leads" metric

**2. Closed Won/Lost:**
- In final stage (`isFinal: true`)
- Can be archived or active
- **ALWAYS counted in metrics** (even if archived)

**3. Archived Lead:**
- `isArchived: true`
- Has `archivedAt` timestamp
- Has optional `archivedReason`
- Hidden from Kanban view (unless final stage)

### Critical Business Logic

**⚠️ IMPORTANT: Archived Leads & Metrics**

```typescript
// Closed Won/Lost: Count ALL (including archived)
const closedWon = leads.filter(l => {
  const stage = stages.find(s => s.id === l.currentStageId);
  return stage?.isFinal && stage.name.includes('Won');
  // Note: No isArchived filter!
});

// Active Leads: Exclude archived
const activeLeads = leads.filter(l => {
  const stage = stages.find(s => s.id === l.currentStageId);
  return !stage?.isFinal && !l.isArchived;
});
```

**Why?**
- Archiving a won deal doesn't make it "not won"
- Metrics must remain accurate after archiving
- Archiving is for organization, not outcome tracking

### Lead Movement Workflow

**Moving to Final Stages:**
```typescript
// This is the ONLY way to mark a deal as Won/Lost
await campaignsApi.moveLeadToStage(leadId, closedWonStageId);

// Confirmation dialog shown to user:
"Move this lead to Closed Won?"
"This will mark the deal as WON and count toward your win rate."
```

**Archiving vs. Closing:**
```
Closing (move to final stage):
  → Marks deal outcome (Won/Lost)
  → Affects win rate calculation
  → Lead still visible in final stage column

Archiving:
  → Organizational action (cleanup)
  → Does NOT affect outcome metrics
  → Hides from active pipeline view
  → Can be done at ANY stage
```

### Converting Archived Leads

**User Flow:**
1. User views "Archived" tab
2. Clicks "Convert to Lead" on archived lead
3. System shows numbered list of active stages
4. User selects stage number
5. Lead is:
   - Unarchived (`isArchived: false`)
   - Moved to selected stage
   - Archive metadata cleared
   - Interaction logs created

**Backend Handler:**
```typescript
// PUT /campaigns/:id/leads/:leadId/convert-to-lead
// 1. Validate lead is archived
// 2. Validate target stage exists
// 3. Update lead:
await prisma.lead.update({
  data: {
    isArchived: false,
    archivedAt: null,
    archivedReason: null,
    currentStageId: targetStageId
  }
});
// 4. Create audit trail interactions
```

---

## 🔄 Data Flow

### API Request Flow

```
Frontend Component
    ↓
API Client (lib/api.ts)
    ↓
Express Route Handler
    ↓
Auth Middleware (verify JWT)
    ↓
Role Check Middleware
    ↓
Campaign Access Check
    ↓
Prisma Database Query
    ↓
Response to Frontend
    ↓
State Update & UI Refresh
```

### Lead Stage Change Flow

```
User drags lead in Kanban
    ↓
onMoveLeadToStage(leadId, stageId)
    ↓
Check if final stage → Show confirmation
    ↓
API: PUT /campaigns/:id/leads/:leadId/stage
    ↓
Validate: Campaign access, stage ownership
    ↓
Prisma Transaction:
  - Update lead.currentStageId
  - Create STAGE_CHANGE interaction
    ↓
Return updated lead
    ↓
Frontend: Reload leads, update UI
```

---

## 🎨 Common Patterns

### Loading Data Pattern

```typescript
// Load ALL leads including archived for metrics
async function loadLeads() {
  try {
    const data = await campaignsApi.getLeads(campaignId);
    setLeads(data);  // Includes archived leads
  } catch (error: any) {
    toast.error(error.message);
  }
}

// Filter in UI based on context:
// Kanban: leads.filter(l => !l.isArchived)
// Metrics: leads (all of them)
// Archived view: leads.filter(l => l.isArchived)
```

### Transaction Pattern

```typescript
// Use Prisma transactions for multi-step operations
const [updatedLead] = await prisma.$transaction([
  prisma.lead.update({ /* ... */ }),
  prisma.interaction.create({ /* ... */ })
]);
// Both succeed or both fail - no partial updates
```

### Error Handling Pattern

```typescript
try {
  const result = await someAsyncOperation();
  toast.success("Operation successful");
  await refreshData();
} catch (error: any) {
  toast.error(error.message || "Operation failed");
  console.error("Detailed error:", error);
}
```

---

## ⚡ Important Business Logic

### Win Rate Calculation

```typescript
const won = leads.filter(l => 
  stage?.isFinal && stage.name.includes('Won')
).length;

const lost = leads.filter(l => 
  stage?.isFinal && stage.name.includes('Lost')
).length;

const winRate = (won + lost) > 0 
  ? Math.round((won / (won + lost)) * 100) 
  : 0;
```

### Interaction Logging

Every major lead action creates an Interaction record:

```typescript
// Stage changes
type: "STAGE_CHANGE"
content: "Stage changed to Qualified"

// Notes
type: "NOTE"
content: "Lead archived: No longer interested"

// Emails
type: "EMAIL"
content: "Sent proposal email"
```

**Purpose:**
- Audit trail for compliance
- Lead activity timeline
- Performance tracking
- User accountability

### Campaign Status Lifecycle

```
DRAFT → ACTIVE → PAUSED ⟷ ACTIVE → COMPLETED
   ↓       ↓        ↓        ↓          ↓
   └───────┴────────┴────────┴──────────→ ARCHIVED
```

---

## 🚀 Getting Started (Quick Reference)

### Environment Setup
```bash
# Install dependencies
bun install

# Setup database
cd packages/db
cp .env.example .env  # Configure DATABASE_URL
bunx prisma migrate dev

# Start development
cd ../..
bun dev  # Starts both frontend and backend
```

### Common Commands
```bash
# Database
bunx prisma studio              # View database
bunx prisma migrate dev         # Create migration
bunx prisma migrate reset       # Reset database

# Development
bun dev                         # Start all apps
bun run build                   # Build for production
```

---

## 📝 Code Comments Guide

### When to Add Comments

**✅ DO comment:**
- Complex business logic
- Non-obvious algorithms
- Security-critical code
- API endpoints (purpose, params, responses)
- Helper functions (what they do, why they exist)

**❌ DON'T comment:**
- Obvious code (`// increment i`)
- Variable declarations (`const userId = req.user.userId // get user ID`)
- Self-explanatory function names\

## 🐛 Debugging Tips

### Common Issues

**1. "Access Denied" errors:**
- Check user role matches required role
- Verify user in campaign.assignedToIds
- Ensure JWT token is valid

**2. Archived leads not showing:**
- Backend must return ALL leads
- Frontend filters based on view mode
- Check `isArchived` filter in query

**3. Stage movement fails:**
- Verify stage belongs to campaign's pipeline
- Check if lead belongs to campaign
- Ensure user has campaign access