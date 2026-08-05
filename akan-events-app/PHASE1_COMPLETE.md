# Akan Events App - Phase 1 Complete ✅

## Status: Frontend Complete & Tested

### What's Been Built

#### 1. **Landing Page** (`/`)
- Displays all 13 events (5 day + 5 night + 3 seasonal)
- Day events section with responsive grid
- Night events section  
- Beautiful dark/light theme toggle
- Event cards with image, title, tagline, date, time, price, tags
- Special badges for featured/popular events
- Full responsive design

#### 2. **Event Details Page** (`/event/[id]`)
- Full event details with hero image
- Event metadata (date, time, price)
- Event description
- Highlights/tags section
- Sticky booking widget on desktop
- Theme toggle support

#### 3. **Booking Form** (4-Step Process)
- **Step 1**: Party Size selection (1, 2, 4, 6 guests)
- **Step 2**: Guest Details (name, email, mobile)
- **Step 3**: Payment Method selection (hold, UPI, card)
- **Step 4**: Review & Confirm with all details

#### 4. **Booking Confirmation Page** (`/event/[id]/confirmation`)
- Success message with checkmark
- Booking reference number (generated)
- "Back to Home" link
- "Print Confirmation" button
- Theme toggle support

#### 5. **API Route** (`/api/bookings`)
- POST endpoint for creating bookings
- GET endpoint for fetching bookings
- Currently stores in memory (ready for PostgreSQL integration)
- Generates unique booking IDs
- Validation of required fields

### Tech Stack Used
- **Framework**: Next.js 16.2.6 with TypeScript
- **Styling**: Inline styles (styled-components ready)
- **State Management**: React hooks (useState)
- **Routing**: Next.js App Router with dynamic routes
- **Theme System**: Custom theme constants with dark/light modes

### Files Created

**Core Library Files:**
- `lib/types.ts` - TypeScript interfaces for Event, Booking, Theme
- `lib/constants.ts` - All 13 events data + helper functions
- `lib/theme.ts` - Theme colors (dark/light) + hue mappings

**Components/Pages:**
- `app/page.tsx` - Landing page
- `app/event/[id]/page.tsx` - Event details page
- `app/event/[id]/confirmation/page.tsx` - Booking confirmation page
- `app/api/bookings/route.ts` - Bookings API

### Tested Features ✅
- [x] Homepage loads with all events
- [x] Event cards display correctly
- [x] Click to event details works
- [x] Booking form Step 1 → Party Size
- [x] Booking form Step 2 → Guest Details
- [x] Booking form Step 3 → Payment Method
- [x] Booking form Step 4 → Confirmation
- [x] Form submission creates booking
- [x] Confirmation page shows booking reference
- [x] Theme toggle works on all pages
- [x] Responsive layout

### Running the App

```bash
cd /Users/vijaykrishna/Documents/akan-events-page/akan-events-app
npm run dev
```

App runs on: `http://localhost:3000`

---

## Phase 2: Admin Dashboard (Next Steps)

The following pages need to be built:

### 1. Admin Login Page (`/admin/login`)
- Email + password form
- NextAuth.js integration (to be added)
- Remember me checkbox
- "Forgot password" link

### 2. Admin Dashboard Home (`/admin`)
- Overview cards: Total events, total bookings, abandoned forms
- Recent bookings list
- Chart/stats (optional)

### 3. Events Management (`/admin/events`)
- **List View**: Table of all events with status
- **Create Event**: Form to add new event
- **Edit Event**: Form to modify event details
- **Delete Event**: With confirmation
- Fields: title, tagline, description, date, time, price, capacity, image, tags, etc.

### 4. Bookings Management (`/admin/bookings`)
- List all bookings with search/filter
- Columns: Booking ID, Event, Guest Name, Party Size, Date, Status
- Sync with ReserveGo API button
- Export to CSV
- Mark as attended/no-show

### 5. Abandoned Forms (`/admin/abandoned-forms`)
- List incomplete bookings
- Columns: Event, Session ID, Step Completed, Time
- Send recovery email button
- Auto-cleanup old forms

---

## Phase 3: Database & Backend Integration

### PostgreSQL Schema (Ready to Implement)

```sql
-- Events table
CREATE TABLE akan_events (
  id UUID PRIMARY KEY,
  kind VARCHAR(50),
  title VARCHAR(255),
  tagline TEXT,
  date VARCHAR(100),
  time VARCHAR(100),
  price VARCHAR(100),
  image_url TEXT,
  hue VARCHAR(50),
  featured BOOLEAN,
  body TEXT,
  tags TEXT[],
  note VARCHAR(100),
  capacity INT,
  booked INT DEFAULT 0,
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Bookings table
CREATE TABLE akan_bookings (
  id UUID PRIMARY KEY,
  booking_id VARCHAR(50) UNIQUE,
  event_id UUID REFERENCES akan_events(id),
  name VARCHAR(255),
  email VARCHAR(255),
  mobile VARCHAR(20),
  pax INT,
  payment_method VARCHAR(20),
  reservego_reference_id VARCHAR(255),
  status VARCHAR(20),
  sync_attempts INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Abandoned forms table
CREATE TABLE akan_abandoned_forms (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES akan_events(id),
  session_id VARCHAR(255),
  step_completed INT,
  form_data JSONB,
  recovery_email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Prisma Setup Needed
```bash
npm install @prisma/client
npx prisma init
# Configure DATABASE_URL in .env.local
npx prisma migrate dev --name init
```

---

## Phase 4: Email & External API Integration

### Email Setup (Nodemailer)
```bash
npm install nodemailer
```

**Templates:**
- Booking confirmation email
- Abandoned form recovery email
- Admin notifications

### ReserveGo API Integration
- Endpoint: `https://api.reservego.co/api/bookings/reservation/create`
- Auto-sync on booking creation
- Retry logic (3 attempts, 5-min intervals)
- Error tracking and alerts

---

## Phase 5: Deployment

### Hostinger VPS Setup
- Domain: `events.akanhyd.com`
- Database: PostgreSQL connection string
- Nginx reverse proxy
- SSL certificate
- Environment variables (.env.production)

---

## Current Development Server

Terminal ID: 25ee79ae-caba-407c-b473-29799a2d0ed4
Status: ✅ Running on http://localhost:3000

To stop: `Ctrl+C` in terminal
To restart: `npm run dev`

---

## Next Actions

1. **Set up Admin Authentication**
   - Install NextAuth.js
   - Create admin user table
   - Implement login flow

2. **Build Admin Pages**
   - Events CRUD
   - Bookings management
   - Abandoned forms tracking

3. **Connect to Database**
   - Install Prisma
   - Configure PostgreSQL
   - Generate Prisma client

4. **Integrate External Services**
   - Setup Nodemailer for emails
   - Implement ReserveGo API sync
   - Add error handling & retries

5. **Deploy to Hostinger**
   - Configure VPS
   - Deploy Next.js app
   - Setup domain & SSL

---

## Quick Reference

**Frontend URLs:**
- Landing: http://localhost:3000
- Event Details: http://localhost:3000/event/[id]
- Confirmation: http://localhost:3000/event/[id]/confirmation

**Event IDs Available:**
- Day: sunday-brunch, pizza-workshop, mixology-workshop, sushi-workshop, leather-workshop
- Night: band-infusion, sundowner-acoustic, reggae-collective, dj-aarya, dj-karan
- Seasonal: mango-fest, monsoon-menu, nye

**Test Booking Data (Pre-filled):**
- Guest: Vijay Krishna
- Email: vijay@example.com
- Mobile: 9876543210
- Party: 2 guests
- Payment: Hold

---

## Success Metrics ✅

- [x] All 13 events display correctly
- [x] Booking flow is intuitive (4 steps)
- [x] API creates bookings successfully
- [x] Confirmation page shows reference ID
- [x] Theme system works (dark/light)
- [x] Responsive on mobile/tablet/desktop
- [x] No console errors
- [x] All links work correctly
