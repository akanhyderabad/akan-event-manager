# Akan Events: Next.js Web App + Admin Dashboard
## Comprehensive Execution Plan

---

## 🎯 Project Overview

**Goal:** Convert prototype HTML/React files into production Next.js application with:
- **Public Site:** events.akanhyd.com (landing → event details → booking)
- **Admin Dashboard:** events.akanhyd.com/dashboard (CMS + analytics)
- **Backend API:** Event CRUD, bookings, analytics
- **Database:** PostgreSQL/MongoDB for events and bookings

**Timeline:** 4-5 weeks  
**Tech Stack:** Next.js 14+, React, TypeScript, Tailwind CSS, Prisma/Supabase, PostgreSQL

---

## 📊 Current Assets Inventory

| Component | Lines | Status |
|-----------|-------|--------|
| Home Page (app + cards + sections + css) | 2,584 | ✅ Ready to convert |
| Event Details Page (event-page + booking modal) | 3,017 | ✅ Ready to convert |
| Event Data (13 events) | - | ✅ Ready to migrate |
| **Total Production Code** | **5,601** | ✅ Fully available |

---

## 🏗️ Architecture

```
events.akanhyd.com
├── / (Home - Landing page with all events)
├── /event/[id] (Event Details + Booking)
├── /event/[id]/confirmation (Booking confirmation)
├── /dashboard (Protected Admin Area)
│   ├── /dashboard/events (View/Create/Edit/Delete events)
│   ├── /dashboard/bookings (View all bookings)
│   ├── /dashboard/analytics (Stats + Tracking)
│   └── /dashboard/settings (App settings & colors)
└── API Routes (/api)
    ├── /api/events (GET, POST)
    ├── /api/events/[id] (GET, PATCH, DELETE)
    ├── /api/bookings (GET, POST)
    ├── /api/bookings/[id] (GET, PATCH)
    └── /api/dashboard/analytics (GET)
```

---

## 📋 Detailed Phases

### PHASE 1: Project Setup & Architecture (Days 1-3)

#### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest akan-events --typescript --tailwind
cd akan-events
```

**Dependencies to install:**
- `prisma` - ORM for database
- `@prisma/client` - Prisma client
- `next-auth` - Authentication (admin login)
- `zod` - Schema validation
- `react-hook-form` - Form handling
- `recharts` - Analytics charts
- `date-fns` - Date formatting
- `framer-motion` - Animations (port from prototype)

#### 1.2 Database Setup
- **Option A:** Supabase (PostgreSQL hosted, built-in auth)
- **Option B:** Vercel Postgres + Prisma
- **Option C:** Self-hosted PostgreSQL

**Database Schema:**
```sql
-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  tagline VARCHAR(255),
  kind VARCHAR(100), -- "Workshop", "Brunch", "Live Music", etc.
  description TEXT,
  date VARCHAR(100),
  time VARCHAR(100),
  price VARCHAR(100),
  image_url VARCHAR(500),
  hue VARCHAR(50), -- "sunny", "tomato", "citrus", etc.
  featured BOOLEAN,
  note VARCHAR(100),
  tags JSON,
  body TEXT,
  capacity INT,
  booked INT DEFAULT 0,
  status VARCHAR(50), -- "active", "sold-out", "archived"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name VARCHAR(255),
  mobile VARCHAR(20),
  email VARCHAR(255),
  pax INT,
  pay_method VARCHAR(50), -- "upi", "card", "hold"
  paid BOOLEAN,
  amount INT,
  status VARCHAR(50), -- "pending", "confirmed", "completed", "cancelled"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics/Tracking
CREATE TABLE analytics (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  views INT DEFAULT 0,
  clicks INT DEFAULT 0,
  bookings_completed INT DEFAULT 0,
  revenue INT DEFAULT 0,
  date DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Project Structure
```
akan-events/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (Home/Landing)
│   ├── event/
│   │   ├── [id]/
│   │   │   ├── page.tsx (Event details)
│   │   │   └── confirmation/
│   │   │       └── page.tsx (Booking confirmation)
│   ├── dashboard/
│   │   ├── layout.tsx (Protected)
│   │   ├── page.tsx (Dashboard home)
│   │   ├── events/
│   │   │   ├── page.tsx (List events)
│   │   │   ├── new/page.tsx (Create event)
│   │   │   └── [id]/edit/page.tsx (Edit event)
│   │   ├── bookings/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── events/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/route.ts (GET, PATCH, DELETE)
│   │   ├── bookings/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/route.ts (GET, PATCH)
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts (NextAuth)
│   │   └── dashboard/
│   │       └── analytics/route.ts (Analytics data)
│   └── components/
│       ├── EventCard.tsx (From cards.jsx)
│       ├── EventDetails.tsx (From event-page.jsx)
│       ├── BookingModal.tsx (From booking-modal.jsx)
│       ├── BgScene.tsx (From bg-scene.jsx)
│       ├── Navigation.tsx
│       ├── Footer.tsx
│       ├── AdminNav.tsx
│       ├── EventForm.tsx
│       └── AnalyticsChart.tsx
├── lib/
│   ├── db.ts (Prisma setup)
│   ├── auth.ts (NextAuth config)
│   ├── hooks/useTheme.ts
│   ├── types/index.ts (TypeScript interfaces)
│   └── utils/validation.ts
├── styles/
│   ├── globals.css (Global + Tailwind)
│   ├── events.module.css (Event page specific)
│   └── dashboard.module.css (Dashboard specific)
├── public/
│   └── assets/ (Logos, icons)
├── prisma/
│   └── schema.prisma
└── .env.local (Database URL, NextAuth secret)
```

#### 1.4 Environment Variables
```
DATABASE_URL=postgresql://user:password@host/akan_events
NEXTAUTH_URL=https://events.akanhyd.com
NEXTAUTH_SECRET=<random-secret>
ADMIN_EMAIL=admin@akanhyd.com
ADMIN_PASSWORD_HASH=<bcrypt-hash>
```

---

### PHASE 2: Frontend - Landing Page & Event Details (Days 4-8)

#### 2.1 Convert Home Page to Next.js
**File:** `app/page.tsx`

**Tasks:**
1. Port `app.jsx` → React component
2. Port `cards.jsx` → `EventCard.tsx` component
3. Port `sections.jsx` → Page sections
4. Port `styles.css` → Tailwind or CSS modules
5. Replace static data with API call:
   ```typescript
   // app/page.tsx
   async function HomePage() {
     const events = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events`);
     const data = await events.json();
     return <LandingPage events={data.events} />;
   }
   ```

**Key Components:**
- `EventCard.tsx` - Individual event card (day/night/featured variants)
- `EventSection.tsx` - "Day Events" / "Night Events" sections
- `EventModal.tsx` - Quick preview modal (optional)
- `Navigation.tsx` - Top nav with scroll detection
- `Header.tsx` - Gradient header (day/night modes)

#### 2.2 Convert Event Details Page
**File:** `app/event/[id]/page.tsx`

**Tasks:**
1. Port `event-page.jsx` → Dynamic page
2. Port `desktop-event-page.jsx` → Desktop-optimized layout
3. Port `booking-modal.jsx` → `BookingModal.tsx` component
4. Port `bg-scene.jsx` → `BgScene.tsx` (animations)
5. Port `poster.jsx` → `EventPoster.tsx` component
6. Add responsive layout detection (mobile/desktop)

**Dynamic Routing:**
```typescript
// app/event/[id]/page.tsx
export async function generateStaticParams() {
  const events = await db.event.findMany();
  return events.map((event) => ({ id: event.id }));
}

export default async function EventPage({ params }) {
  const event = await db.event.findUnique({ where: { id: params.id } });
  return <EventDetail event={event} />;
}
```

#### 2.3 Booking Confirmation Page
**File:** `app/event/[id]/confirmation/page.tsx`

Shows:
- Booking reference number
- Event details
- Attendee info
- Payment status
- Countdown timer
- QR code

#### 2.4 Styling Strategy
- **Base:** Tailwind CSS (utility classes)
- **Custom animations:** CSS modules or Framer Motion
- **Fonts:** Google Fonts (Fraunces, Inter, Instrument Serif, Manrope)
- **Dark/Light themes:** Use Next.js `next-themes` or Tailwind `dark:` prefix

---

### PHASE 3: Admin Dashboard (Days 9-14)

#### 3.1 Authentication
**File:** `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const handler = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Check against admin credentials in DB
        const admin = await db.admin.findUnique({
          where: { email: credentials?.email },
        });
        if (admin && bcrypt.compareSync(credentials?.password, admin.password_hash)) {
          return { id: admin.id, email: admin.email, name: admin.name };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/dashboard/login",
  },
});
```

#### 3.2 Events Management
**File:** `app/dashboard/events/page.tsx`

Features:
- List all events (table view)
- Search & filter
- Create new event (form)
- Edit event (form)
- Delete event (with confirmation)
- Bulk actions (archive, delete)
- Sort by date/popularity/bookings

**Event Form Fields:**
```
- Title
- Tagline  
- Description (body)
- Kind (dropdown: Workshop, Brunch, Live Music, etc.)
- Date & Time
- Price
- Capacity
- Image URL (or upload)
- Hue (color theme)
- Tags (multi-select)
- Featured (toggle)
- Status (active/archived/sold-out)
- Note (optional badge)
```

#### 3.3 Bookings Management
**File:** `app/dashboard/bookings/page.tsx`

Features:
- List all bookings (filterable table)
- Filter by event, status, date range
- View booking details
- Mark as confirmed/completed/cancelled
- Export to CSV
- Search by name/mobile/email
- Pagination (50 per page)

**Booking Details Modal:**
- Event name
- Guest name, email, mobile
- Party size
- Payment method & status
- Booking date
- Actions: Send reminder, Mark paid, Cancel, Email invoice

#### 3.4 Analytics Dashboard
**File:** `app/dashboard/analytics/page.tsx`

Features:
- KPIs (total events, total bookings, revenue, conversion rate)
- Events by status pie chart
- Bookings over time line chart
- Revenue over time
- Top performing events
- Top revenue days/times
- Guest demographics
- Payment method breakdown
- Export analytics (PDF/CSV)

**Charts:**
- Line chart: Bookings by date
- Bar chart: Events comparison
- Pie chart: Payment methods
- Table: Top events

#### 3.5 Settings
**File:** `app/dashboard/settings/page.tsx`

Features:
- App branding (logo, title)
- Color themes (accent colors)
- Email settings (booking confirmation template)
- Payment settings (UPI, card, hold options)
- Seat availability thresholds
- Notification settings
- Admin users (add/remove)

---

### PHASE 4: Backend - API Routes & Database (Days 15-18)

#### 4.1 API Endpoints

**Events API:**
```
GET    /api/events              → List all events
POST   /api/events              → Create event
GET    /api/events/[id]         → Get event details
PATCH  /api/events/[id]         → Update event
DELETE /api/events/[id]         → Delete event
GET    /api/events/featured     → Get featured events
GET    /api/events/by-date      → Get events grouped by date/time
```

**Bookings API:**
```
GET    /api/bookings            → List bookings (admin only)
POST   /api/bookings            → Create booking
GET    /api/bookings/[id]       → Get booking details
PATCH  /api/bookings/[id]       → Update booking status
POST   /api/bookings/[id]/send-reminder → Send booking reminder
```

**Analytics API:**
```
GET    /api/dashboard/analytics/summary     → KPI data
GET    /api/dashboard/analytics/events      → Events performance
GET    /api/dashboard/analytics/revenue     → Revenue breakdown
GET    /api/dashboard/analytics/guests      → Guest data
GET    /api/dashboard/analytics/export      → Export report
```

#### 4.2 Data Validation
**File:** `lib/validation.ts`

```typescript
import { z } from 'zod';

export const eventSchema = z.object({
  title: z.string().min(5),
  tagline: z.string().min(5),
  kind: z.string(),
  date: z.string(),
  time: z.string(),
  price: z.string(),
  capacity: z.number().positive(),
  // ... other fields
});

export const bookingSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email(),
  pax: z.number().min(1).max(50),
  pay_method: z.enum(['upi', 'card', 'hold']),
});
```

#### 4.3 Prisma Models
**File:** `prisma/schema.prisma`

```prisma
model Event {
  id        String    @id @default(cuid())
  title     String
  tagline   String
  kind      String
  description String
  date      String
  time      String
  price     String
  imageUrl  String?
  hue       String
  featured  Boolean   @default(false)
  note      String?
  tags      String[]
  body      String?
  capacity  Int
  booked    Int       @default(0)
  status    String    @default("active") // active, sold-out, archived
  
  bookings  Booking[]
  analytics EventAnalytic[]
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Booking {
  id        String    @id @default(cuid())
  eventId   String
  event     Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  name      String
  mobile    String
  email     String
  pax       Int
  payMethod String
  paid      Boolean   @default(false)
  amount    Int?
  status    String    @default("pending") // pending, confirmed, completed, cancelled
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model EventAnalytic {
  id        String    @id @default(cuid())
  eventId   String
  event     Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  views     Int       @default(0)
  clicks    Int       @default(0)
  bookingsCompleted Int @default(0)
  revenue   Int       @default(0)
  date      DateTime
  
  updatedAt DateTime  @updatedAt
}

model Admin {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  passwordHash String
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

#### 4.4 Database Seeding
**File:** `prisma/seed.ts`

Seed initial 13 events from `data.js` into database

---

### PHASE 5: Integration & Deployment (Days 19-20)

#### 5.1 Local Testing Checklist
- [ ] Home page loads all events
- [ ] Clicking event navigates to details page
- [ ] Booking modal works (all 4 steps)
- [ ] Form validation works
- [ ] Booking confirmation shows
- [ ] Admin login works
- [ ] Can create/edit/delete events
- [ ] Analytics dashboard displays data
- [ ] Mobile responsive design
- [ ] Dark/light theme toggle
- [ ] API endpoints return correct data

#### 5.2 Environment Setup
- Production database (Supabase/Vercel Postgres)
- NextAuth secret generation
- Email provider setup (for booking confirmations)
- Image optimization (Next.js Image component)
- CDN setup for images

#### 5.3 Deployment to Vercel
```bash
vercel deploy
# Configure custom domains:
# - events.akanhyd.com → Production
# - events-staging.akanhyd.com → Staging
```

#### 5.4 DNS Configuration
```
events.akanhyd.com     → Vercel project
events.akanhyd.com     → cname.vercel-dns.com
```

#### 5.5 Post-Deployment
- [ ] Test all routes
- [ ] Verify database connection
- [ ] Test email notifications
- [ ] Check analytics tracking
- [ ] Performance optimization
- [ ] SEO setup (next-seo)
- [ ] Error monitoring (Sentry)

---

## 📦 Deliverables by Phase

| Phase | Deliverables | Est. Time |
|-------|--------------|-----------|
| **1** | Project setup, DB schema, auth | 3 days |
| **2** | Landing page, Event details, Booking flow | 5 days |
| **3** | Admin dashboard (events, bookings, analytics) | 6 days |
| **4** | API routes, validation, analytics | 4 days |
| **5** | Testing, deployment, DNS | 2 days |
| **TOTAL** | **Production Next.js app** | **20 days** |

---

## 🔌 API Integration Points

### Public Frontend
```
GET /api/events
├─ Used by: Home page (landing)
├─ Returns: Array of all events
└─ Cache: 1 hour

GET /api/events/[id]
├─ Used by: Event details page
├─ Returns: Single event with full details
└─ Cache: 1 hour

POST /api/bookings
├─ Used by: Booking modal submission
├─ Validation: Email, phone, capacity
└─ Response: Booking confirmation + reference

GET /api/bookings/[id]
├─ Used by: Confirmation page
├─ Returns: Booking details
└─ Auth: Reference ID verification
```

### Admin Dashboard
```
GET /api/events (with auth)
├─ Used by: Events list
└─ Returns: All events + analytics

POST/PATCH/DELETE /api/events/[id] (with auth)
├─ Used by: Event management
└─ Auth: Admin only

GET /api/bookings (with auth)
├─ Used by: Bookings table
├─ Filters: Event, date range, status
└─ Pagination: 50 per page

GET /api/dashboard/analytics (with auth)
├─ Used by: Analytics page
└─ Returns: KPIs, charts data
```

---

## 🎨 Design & UX Considerations

### Home Page (Landing)
- Header with nav + scroll detection (day/night mode)
- Featured event hero section
- Day events grid
- Night events grid
- Sticky booking CTA
- Footer

### Event Details Page
- Hero image + poster
- About section
- Booking widget (sticky on desktop)
- Countdown timer
- Scarcity indicator
- Venue map
- Reviews section
- FAQ
- Similar events

### Admin Dashboard
- Sidebar navigation
- Dark mode support
- Responsive layout
- Batch actions
- Inline editing
- Real-time updates
- Export capabilities

---

## 🔐 Security Considerations

- [ ] Admin authentication (NextAuth + JWT)
- [ ] API rate limiting
- [ ] Input validation (Zod)
- [ ] SQL injection prevention (Prisma ORM)
- [ ] CORS configuration
- [ ] HTTPS only
- [ ] Password hashing (bcrypt)
- [ ] Booking data privacy
- [ ] Admin audit logs

---

## 📊 Analytics Tracking

Track in database:
- Page views (home, event details, event card clicks)
- Booking funnel (start → completion → payment)
- Conversion rates by event
- Revenue by event/date/time
- Payment method preferences
- Peak booking times
- Guest demographics
- Abandoned bookings

---

## 🚀 Future Enhancements (Post-Launch)

1. **Payments Integration**
   - Razorpay/Stripe integration
   - Payment gateway

2. **Email Notifications**
   - Booking confirmation
   - Booking reminders (24h before)
   - Event updates

3. **Social Features**
   - Share event on social media
   - Wishlist/favorites
   - User account/booking history

4. **SEO & Marketing**
   - Meta tags per event
   - Schema markup (Event)
   - OG images
   - Sitemap generation

5. **Mobile App**
   - React Native version
   - Push notifications
   - Offline browsing

---

## 📝 File Migration Strategy

```
Current Prototype          →  Next.js Structure
──────────────────────────────────────────────────
app.jsx                   →  app/page.tsx + hooks
cards.jsx                 →  components/EventCard.tsx
sections.jsx              →  components/EventSection.tsx
event-page.jsx            →  app/event/[id]/page.tsx
booking-modal.jsx         →  components/BookingModal.tsx
bg-scene.jsx              →  components/BgScene.tsx
styles.css                →  app/globals.css + Tailwind
data.js                   →  prisma/seed.ts
```

---

## ✅ Success Criteria

- [ ] All 13 events display on home page
- [ ] Event details page shows full info + booking
- [ ] Booking flow completes successfully
- [ ] Admin can CRUD events
- [ ] Analytics dashboard shows real data
- [ ] Mobile responsive (tested on iOS/Android)
- [ ] Desktop responsive (tested on 1920px+)
- [ ] API response time < 200ms
- [ ] Lighthouse score > 90
- [ ] Zero broken links
- [ ] All animations working smoothly

---

## 👥 Team Structure (Recommended)

- **1 Full-stack Developer** - Next.js setup, API, DB
- **1 Frontend Developer** - Components, UI, styling
- **1 Backend Developer** - API optimization, analytics
- **QA Tester** - Testing all flows

---

## 💡 Notes

- Reuse all existing styling from `styles.css`
- Port animations using Framer Motion for performance
- Keep dark/light theme toggle functional
- Maintain booking modal logic exactly
- Use TypeScript for type safety
- Consider Vercel for Next.js hosting (optimal performance)
- Use Supabase for PostgreSQL (easy setup + built-in auth option)

