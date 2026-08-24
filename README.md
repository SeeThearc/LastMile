# LastMile ? Last-Mile Delivery Tracker

A production-grade, full-stack last-mile delivery management platform built with React, Node.js/Express, Prisma 6, and PostgreSQL. Features real-time order tracking, zone-based rate calculation, intelligent agent auto-assignment, immutable audit trails, and live email notifications.

---

## What We Built (Beyond the Brief)

| Feature | Details |
|---|---|
| Smooth UI animations | fade-in-up keyframes, staggered card delays, hover lift + scale effects |
| Custom Button component | Bottom-filling loading bar, disabled-during-request, no double-submit |
| Toast notifications | react-hot-toast replaces every alert() ? top-right popups |
| 10-digit Tracking IDs | Collision-resistant numeric IDs generated at order creation |
| Live Email notifications | Nodemailer + Gmail SMTP ? on order creation and delivery |
| SMS integration | Twilio code fully wired (trial account limitation for India) |
| Idempotency keys | Prevents duplicate orders on network retry |
| Admin Audit Log | Every admin action persisted immutably |
| Price quote endpoint | /orders/quote ? get pricing before committing |
| Reschedule flow | Customer can reschedule a FAILED order from the dashboard |
| Zone ETA config | Admin sets inter-zone ETA minutes in the DB |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| SMS | Twilio |
| Deployment | Vercel (frontend + backend serverless) |

---

## Project Structure

```
LastMile/
??? backend/
?   ??? prisma/
?   ?   ??? schema.prisma        # Full DB schema
?   ?   ??? migrations/          # Prisma migration history
?   ?   ??? seed.ts              # Zones, areas, rate cards, users
?   ??? src/
?   ?   ??? server.ts            # Express app + route mounting
?   ?   ??? auth.ts              # POST /auth/login, /auth/register
?   ?   ??? orders.ts            # Customer order CRUD + quote + reschedule
?   ?   ??? agents.ts            # Agent status updates + self-management
?   ?   ??? admin.ts             # Admin management + auto-assign engine
?   ?   ??? notifications.ts     # Nodemailer + Twilio dispatch
?   ?   ??? middleware.ts        # JWT auth guard
?   ?   ??? utils.ts             # Rate engine, zone resolver, ID generator
?   ?   ??? prisma.ts            # PrismaClient singleton
?   ??? vercel.json
?   ??? package.json
??? frontend/
    ??? src/
    ?   ??? pages/               # Login, Register, Dashboard, AgentDashboard,
    ?   ?                        # AdminDashboard, CreateOrder, History
    ?   ??? components/          # Layout (navbar), Button (loading bar)
    ?   ??? index.css            # Tailwind + custom keyframe animations
    ??? vercel.json
    ??? package.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (local, Neon, Supabase, or Railway)

### 1. Clone
```bash
git clone https://github.com/SeeThearc/LastMile.git
cd LastMile
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npx prisma migrate deploy
npx prisma db seed
npm run dev        # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
# Create frontend/.env
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev        # http://localhost:5173
```

---

## .env Reference

```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/lastmile

# Auth (required)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars

# Email ? Gmail SMTP (optional, for notifications)
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16char_gmail_app_password

# SMS ? Twilio (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

# Server
PORT=4000
NODE_ENV=development
```

---

## Database Schema

```
User
  id            String   (cuid)
  name          String
  email         String   unique
  phone         String?
  passwordHash  String
  role          CUSTOMER | AGENT | ADMIN
  availability  AVAILABLE | BUSY | OFFLINE   (agents only)
  currentZoneId String?                       (agents only)

Zone
  id    String
  name  String unique

Area
  id       String
  name     String unique
  pincode  String?
  zoneId   String ? Zone

RateCard
  zoneId       String ? Zone
  orderType    B2B | B2C
  isIntraZone  Boolean
  ratePerKg    Float
  codSurcharge Float
  UNIQUE(zoneId, orderType, isIntraZone)

ZoneETA
  fromZoneId  String ? Zone
  toZoneId    String ? Zone
  etaMinutes  Int
  UNIQUE(fromZoneId, toZoneId)

Order
  id               String  (10-digit numeric, unique)
  idempotencyKey   String? unique
  customerId       String ? User
  agentId          String? ? User
  pickupAddress    String
  dropAddress      String
  pickupArea       String
  dropArea         String
  pickupZoneId     String ? Zone
  dropZoneId       String ? Zone
  length/breadth/height/actualWeight  Float
  orderType        B2B | B2C
  paymentType      PREPAID | COD
  status           CREATED | ASSIGNED | PICKED_UP | IN_TRANSIT |
                   OUT_FOR_DELIVERY | DELIVERED | FAILED | RESCHEDULED
  volumetricWeight Float
  billableWeight   Float
  ratePerKg        Float
  baseCharge       Float
  codSurcharge     Float
  totalCharge      Float
  estimatedDeliveryAt DateTime?
  scheduledAt         DateTime?

TrackingEvent  (append-only, never updated)
  orderId    String ? Order
  fromStatus OrderStatus?
  toStatus   OrderStatus
  actorId    String ? User
  actorRole  UserRole
  note       String?
  createdAt  DateTime

AdminAuditLog
  adminId    String ? User
  action     String
  entityType String
  entityId   String
  details    String
```

---

## Rate Calculation Logic

All logic lives in `backend/src/utils.ts ? calculatePrice()`.

### Step 1 ? Volumetric Weight
```
volumetricWeight = (length ? breadth ? height) / 5000
```

### Step 2 ? Billable Weight (industry standard)
```
billableWeight = max(actualWeight, volumetricWeight)
```

### Step 3 ? Zone Detection
- Pickup area/pincode ? `Area` table lookup (case-insensitive name OR pincode match) ? resolved Zone
- Drop area/pincode ? same lookup
- `isIntraZone = (pickupZone.id === dropZone.id)`

### Step 4 ? Rate Card Lookup
```sql
SELECT * FROM RateCard
WHERE zoneId     = pickupZone.id
  AND orderType  = 'B2B' | 'B2C'
  AND isIntraZone = true | false
```

### Step 5 ? Final Charges
```
baseCharge   = billableWeight ? ratePerKg
codSurcharge = paymentType === 'COD' ? rateCard.codSurcharge : 0
totalCharge  = baseCharge + codSurcharge
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | ? | Register customer |
| POST | /auth/login | ? | Login, returns JWT + role |

### Orders (Customer)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /orders/me | CUSTOMER | My orders |
| GET | /orders/:id | CUSTOMER | Single order + tracking history |
| POST | /orders | CUSTOMER | Create order |
| POST | /orders/quote | CUSTOMER | Price quote (no order created) |
| POST | /orders/:id/reschedule | CUSTOMER | Reschedule FAILED order |

### Agent
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /agents/orders | AGENT | Assigned orders |
| GET | /agents/orders/:id | AGENT | Single assigned order |
| PUT | /agents/orders/:id/status | AGENT | Update status (FSM enforced) |
| PUT | /agents/me | AGENT | Update own availability/zone |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /admin/orders | ADMIN | All orders (filter by status/zone/unassigned) |
| POST | /admin/orders/:id/assign | ADMIN | Manual agent assignment |
| POST | /admin/orders/:id/auto-assign | ADMIN | Auto-assign best agent |
| GET | /admin/agents | ADMIN | All agents |
| PUT | /admin/agents/:id | ADMIN | Update agent availability/zone |
| POST | /admin/agents | ADMIN | Create agent account |
| GET | /admin/zones | ADMIN | All zones |
| POST | /admin/zones | ADMIN | Create zone |
| POST | /admin/areas | ADMIN | Add area/pincode to zone |
| POST | /admin/ratecards | ADMIN | Add rate card |
| POST | /admin/etas | ADMIN | Set inter-zone ETA |
| GET | /admin/stats | ADMIN | Dashboard stats |
| GET | /health | ? | Health check |

---

## Deployed URLs

- **Frontend:** https://last-mile-jet.vercel.app
- **Backend API:** https://last-mile-backend.vercel.app

### Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@lastmile.com | admin123 |
| Agent | agent@lastmile.com | agent123 |
| Customer | customer@lastmile.com | customer123 |

---

*LastMile ? Built for the Last-Mile Delivery OA | Unthinkable Solutions*
