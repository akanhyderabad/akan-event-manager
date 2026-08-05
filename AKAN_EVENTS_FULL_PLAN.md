# Akan Events: Complete Implementation Plan with API Integration

## 📊 Project Structure

```
events.akanhyd.com/
├── / ....................... Landing page (all events)
├── /event/[id] ............. Event details page
├── /dashboard/events ....... Event management (CREATE/EDIT/DELETE)
├── /dashboard/bookings ..... View all bookings (from booking form)
├── /dashboard/abandoned .... Abandoned form submissions
└── /api/ ................... Backend routes

Keep Existing Dashboard AS-IS:
└── Restaurant operations (covers, tables, cashier, etc.)
```

---

## 🔌 ReserveGo API Integration

### Production Credentials
```
Base URL: https://api.reservego.co
Endpoint: /api/bookings/reservation/create

API Key: 66e04cec998188478d82aac2
Restaurant ID: 659bd2c91a33ffb38833af30

Staging (for testing):
Base URL: https://stagingapi.reservego.co
```

### Booking Flow (What Happens)
```
Guest fills booking form on event page
    ↓
Saves to akan_bookings table (local DB)
    ↓
Calls ReserveGo API with booking details
    ↓
Gets back reference_id (_id)
    ↓
Stores reference_id in akan_bookings
    ↓
Shows confirmation page with reference
```

### API Request Format (To ReserveGo)
```javascript
{
  "apiKey": "66e04cec998188478d82aac2",
  "restaurantId": "659bd2c91a33ffb38833af30",
  "guestName": "Rohit Kumar",
  "guestPhone": "919999999999",        // numeric, with country code
  "guestEmail": "rohit@example.com",   // optional
  "guestCount": 4,                      // party size (pax)
  "bookingTime": "2026-05-23T21:00:00.000Z",  // ISO format, event time
  "generatedTime": "2026-05-21T14:30:00.000Z", // ISO format, booking time (now)
  "guestComments": "Reservation for Band Infusion — Homecoming",  // event name
  "bookingType": 1,                     // 1 = Reservation
  "status": 1,                          // 1 = Pending
  "source": 9,                          // 9 = Website
  "tags": ["Akan", "Events", "Workshop"]  // optional array
}
```

### API Response
```javascript
// Success
{
  "code": "SUCCESS",
  "message": "Success",
  "_id": "63d2100a0b4ce3a4038047c3"
}

// Failure
{
  "code": "BAD_REQUEST",
  "message": "Missing required parameter"
}
```

---

## 📋 Database Schema

### Table 1: akan_events
```sql
CREATE TABLE akan_events (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  tagline VARCHAR(255),
  kind VARCHAR(100),  -- Workshop, Brunch, Live Band, DJ Night
  description TEXT,
  date VARCHAR(100),  -- "Sat, 23 May 2026"
  time_start VARCHAR(100),  -- "9:00 PM"
  time_end VARCHAR(100),    -- "12:30 AM"
  price VARCHAR(100),  -- "₹500 / redeemable"
  image_url VARCHAR(500),
  hue VARCHAR(50),    -- sunny, tomato, crimson, amber, jade, etc.
  capacity INT,
  booked INT DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  note VARCHAR(100),  -- "Local favourite", "Headliner", "Selling fast"
  body TEXT,          -- long description
  tags JSON,          -- ["Live acoustic", "Bottomless pours"]
  status VARCHAR(50) DEFAULT 'active',  -- active, archived
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table 2: akan_bookings
```sql
CREATE TABLE akan_bookings (
  id VARCHAR(255) PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  mobile VARCHAR(20) NOT NULL,
  pax INT NOT NULL,
  payment_method VARCHAR(50),  -- hold, upi, card
  paid BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, confirmed, completed, cancelled
  reference_id VARCHAR(255),  -- from ReserveGo API (_id)
  reservego_status VARCHAR(50),  -- 1=pending, 2=waitlisted, 3=confirmed
  external_api_error VARCHAR(255),  -- error message if API call failed
  external_api_retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table 3: akan_abandoned_forms
```sql
CREATE TABLE akan_abandoned_forms (
  id VARCHAR(255) PRIMARY KEY,
  event_id VARCHAR(255),
  session_id VARCHAR(255),  -- browser session tracking
  name VARCHAR(255),
  email VARCHAR(255),
  mobile VARCHAR(20),
  pax INT,
  payment_method VARCHAR(50),
  completed_at_step INT,  -- which step they got to (1, 2, 3, 4, or none)
  form_data JSON,  -- all data they entered before abandoning
  abandoned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recovered BOOLEAN DEFAULT false,  -- if they came back and completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎨 Frontend Components (Pages to Build)

### 1. Landing Page (`/`)
**Component: `app/page.tsx`**

```
├─ Header (sticky)
│  ├─ Logo
│  ├─ Nav links
│  └─ Theme toggle
├─ Hero section
├─ "Day Events" section
│  └─ Event cards grid
├─ "Night Events" section
│  └─ Event cards grid
├─ Sticky CTA button
└─ Footer
```

**API Calls:**
```typescript
// GET /api/events
// Returns: array of all events
const events = await fetch('/api/events').then(r => r.json());
```

---

### 2. Event Details Page (`/event/[id]`)
**Component: `app/event/[id]/page.tsx`**

```
├─ Hero image
├─ Event header (title, date, price, tags)
├─ Poster section
├─ About section (description, body)
├─ Booking widget (sticky on desktop)
│  ├─ Party size selector
│  ├─ Booking form
│  ├─ CTA button
│  └─ Countdown timer
├─ Scarcity indicator
├─ Reviews/Testimonials
├─ Venue details
├─ FAQ section
└─ Similar events
```

**API Calls:**
```typescript
// GET /api/events/[id]
const event = await fetch(`/api/events/${id}`).then(r => r.json());

// POST /api/bookings (when guest submits)
// Handles: Save to DB + Call ReserveGo API
```

---

### 3. Booking Confirmation Page (`/event/[id]/confirmation`)
**Component: `app/event/[id]/confirmation/page.tsx`**

```
├─ Success badge
├─ Booking reference number
├─ Event details
├─ Guest details
├─ QR code (reference ID)
├─ "View on calendar" button
└─ "Share" buttons
```

**What happens:**
- Guest gets booking reference
- Email sent with confirmation
- Reference stored in ReserveGo system

---

## 🔧 Admin Dashboard Additions (In Existing Dashboard)

### 1. Events Section (`/dashboard/events`)
**New page: `src/app/admin/events/events-akan/page.tsx`**

#### List View
```
┌─────────────────────────────────────────────────────┐
│ Events (Akan Experiences)                           │
├─────────────────────────────────────────────────────┤
│ [+ New Event] [Filter] [Search]                     │
├─────────────────────────────────────────────────────┤
│ Title          | Date      | Kind  | Bookings | ... │
├─────────────────────────────────────────────────────┤
│ Band Infusion  | May 23    | Live  | 12/50    | ✏️  │
│ Mixology      | Jun 7     | Work. | 8/20     | ✏️  │
└─────────────────────────────────────────────────────┘
```

**Actions:**
- ✏️ Edit event
- 🗑️ Delete event
- 👁️ View on website

#### Create/Edit Event Form
```
Form Fields (ALL REQUIRED):
  ☑ Title
  ☑ Tagline
  ☑ Kind (dropdown)
  ☑ Date (date picker)
  ☑ Start Time (time picker)
  ☑ End Time (time picker)
  ☑ Price
  ☑ Capacity
  ☑ Image URL
  ☑ Hue / Color (dropdown)
  ☑ Description (text area)
  ☑ Body (rich text area)
  ☑ Tags (multi-select)
  ☑ Featured (toggle)
  ☑ Note (badge text)
  ☑ Status (active/archived)

[Save] [Cancel] [Preview]
```

**API Calls:**
```typescript
// POST /api/events (create)
// PATCH /api/events/[id] (edit)
// DELETE /api/events/[id] (delete)
```

---

### 2. Bookings Section (`/dashboard/bookings`)
**New page: `src/app/admin/bookings/page.tsx`**

#### Bookings List
```
┌─────────────────────────────────────────────────────────┐
│ Bookings                                                │
├─────────────────────────────────────────────────────────┤
│ [Filter by event] [Filter by status] [Export CSV]      │
├─────────────────────────────────────────────────────────┤
│ Guest Name | Phone | Event | Pax | Status | Reference  │
├─────────────────────────────────────────────────────────┤
│ Rohit      | 99999 | Band  | 4   | ✓ Conf | RES-12345  │
│ Priya      | 88888 | Mixi  | 2   | ⏳ Pend | RES-12346  │
└─────────────────────────────────────────────────────────┘
```

**Columns:**
- Guest name
- Phone number
- Event name
- Party size (pax)
- Payment method (Hold/UPI/Card)
- Paid status (✓ Paid / ⏳ Pending)
- Reservation status (Pending/Confirmed/Completed)
- Reference ID (from ReserveGo)
- Booking date
- Actions (View details, Mark paid, Cancel, Send email)

**Booking Details Modal:**
```
Guest: Rohit Kumar
Phone: +91 9999999999
Email: rohit@example.com
Party Size: 4 people
Event: Band Infusion — Homecoming
Date: Sat, 23 May 2026 at 9:00 PM
Payment: Hold (not paid)
Reference: RES-12345
Status: Pending confirmation

[Mark as Confirmed] [Mark as Paid] [Send Reminder] [Cancel]
```

**Filters:**
- By event
- By status (pending, confirmed, completed, cancelled)
- By payment status (paid, pending)
- By date range

**Export:**
- CSV with all bookings
- Filter applied bookings only

---

### 3. Abandoned Forms Section (`/dashboard/abandoned`)
**New page: `src/app/admin/abandoned/page.tsx`**

#### Abandoned Submissions List
```
┌────────────────────────────────────────────────────┐
│ Abandoned Bookings                                 │
├────────────────────────────────────────────────────┤
│ [Filter by event] [Filter by step] [Email All]    │
├────────────────────────────────────────────────────┤
│ Guest      | Event  | Step | Abandoned | Actions  │
├────────────────────────────────────────────────────┤
│ John       | Mixi   | 2/4  | 2h ago    | 📧 Remind│
│ Sarah      | Brunch | 1/4  | 5h ago    | 📧 Remind│
└────────────────────────────────────────────────────┘
```

**What This Tracks:**
- Guest started booking but didn't finish
- Which step they got to (1=party size, 2=details, 3=payment, 4=confirm)
- When they abandoned
- Their partial data

**Actions:**
- Send recovery email ("We noticed you didn't complete your booking...")
- View full form data they entered
- Manually complete the booking
- Filter by event, step, time

**Abandoned Forms Details:**
```
Guest Name: John Doe
Email: john@example.com
Phone: 9999999999
Event: Mixology Workshop
Got to step: 2/4 (Details page)
Abandoned: 2 hours ago

Form Data Entered:
- Party Size: 4 ✓
- Name: John Doe ✓
- Phone: 9999999999 ✓
- Email: john@example.com ✓
- Payment method: (not selected)

[Send Recovery Email] [Auto-complete Booking] [Delete]
```

**Abandoned Form Tracking Logic:**
```javascript
// When form loads
track('form_opened', { event_id, session_id })

// When user fills each step
track('step_started', { event_id, step: 1 })
track('step_completed', { event_id, step: 1 })

// When user leaves without completing
track('form_abandoned', { 
  event_id, 
  session_id,
  completed_step: 2,  // got to step 2
  form_data: {...}
})
```

---

## 🚀 API Routes to Build

### Public API (Frontend)

#### 1. GET /api/events
```typescript
// Get all events
// Used by: Landing page
Response: { events: Event[] }
```

#### 2. GET /api/events/[id]
```typescript
// Get single event
// Used by: Event details page
Response: { event: Event }
```

#### 3. POST /api/bookings
```typescript
// Create new booking
// 1. Save to akan_bookings table
// 2. Call ReserveGo API
// 3. Store reference_id
// 4. Send email to guest
// 5. Return confirmation data

Request: {
  event_id: string,
  name: string,
  email: string,
  mobile: string,
  pax: number,
  payment_method: 'hold' | 'upi' | 'card'
}

Response: {
  success: boolean,
  booking_id: string,
  reference_id: string,  // from ReserveGo
  confirmation_url: string
}
```

#### 4. POST /api/bookings/abandon
```typescript
// Track abandoned form
// Saves to akan_abandoned_forms table

Request: {
  event_id: string,
  session_id: string,
  step_completed: number,
  form_data: object
}

Response: { success: boolean }
```

### Admin API (Protected)

#### 5. POST /api/admin/events
```typescript
// Create event (admin only)
// Save to akan_events table

Request: {
  title, tagline, kind, description, date, time_start, time_end,
  price, image_url, hue, capacity, featured, note, body, tags
}
```

#### 6. GET /api/admin/bookings
```typescript
// Get all bookings (admin only)
// Filter by event, status, date range
// Pagination

Query params:
  ?event_id=xxx&status=pending&page=1&limit=50
```

#### 7. GET /api/admin/abandoned
```typescript
// Get abandoned forms (admin only)
// Filter by event, step, date

Query params:
  ?event_id=xxx&min_step=2&recovered=false
```

#### 8. POST /api/admin/bookings/[id]/send-reminder
```typescript
// Send booking reminder email
// Or recovery email for abandoned forms
```

---

## 📧 Email Templates

### Booking Confirmation Email
```
Subject: Your booking is confirmed! Reference: RES-12345

Hi [Guest Name],

Thanks for booking with us! 🎉

EVENT DETAILS:
Title: Band Infusion — Homecoming
Date: Saturday, 23 May 2026
Time: 9:00 PM — 12:30 AM
Party Size: 4 guests
Price: ₹500 per person

YOUR BOOKING REFERENCE: RES-12345
(Show this or scan the QR code at the door)

[View Booking Details] [Add to Calendar] [Share]

See you soon!
— Akan
```

### Abandoned Form Recovery Email
```
Subject: Complete your booking for [Event Name]

Hi [Guest Name],

We noticed you didn't complete your booking for [Event Name] on [Date].

You were almost there! It only takes 1 minute to finish.

[Complete Your Booking]

Any questions? Reply to this email.

— Akan
```

---

## 🔄 ReserveGo API Integration Logic

### When Booking is Submitted
```javascript
async function createBooking(bookingData) {
  // 1. Save to local DB first
  const localBooking = await db.akan_bookings.create({
    event_id: bookingData.event_id,
    name: bookingData.name,
    email: bookingData.email,
    mobile: bookingData.mobile,
    pax: bookingData.pax,
    status: 'pending'
  });

  // 2. Call ReserveGo API
  try {
    const reserveGoResponse = await fetch(
      'https://api.reservego.co/api/bookings/reservation/create',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: '66e04cec998188478d82aac2',
          restaurantId: '659bd2c91a33ffb38833af30',
          guestName: bookingData.name,
          guestPhone: bookingData.mobile.replace(/\D/g, ''),  // numeric only
          guestEmail: bookingData.email,
          guestCount: bookingData.pax,
          bookingTime: event.bookingTime,  // ISO format
          generatedTime: new Date().toISOString(),
          guestComments: `Reservation for ${event.title}`,
          status: 1,  // pending
          source: 9,  // website
          tags: ['Akan', 'Events', event.kind]
        })
      }
    );

    const reserveGoData = await reserveGoResponse.json();

    if (reserveGoData.code === 'SUCCESS') {
      // 3. Update local booking with reference
      await db.akan_bookings.update(localBooking.id, {
        reference_id: reserveGoData._id,
        reservego_status: 1,
        status: 'confirmed'
      });

      // 4. Send confirmation email
      await sendEmail(bookingData.email, 'confirmation', localBooking);

      return {
        success: true,
        booking_id: localBooking.id,
        reference_id: reserveGoData._id
      };
    } else {
      // API failed - retry later
      await db.akan_bookings.update(localBooking.id, {
        external_api_error: reserveGoData.message,
        external_api_retry_count: 1
      });

      // Still send email to guest
      await sendEmail(bookingData.email, 'confirmation', localBooking);

      return {
        success: true,  // local booking ok, but API failed
        booking_id: localBooking.id,
        reference_id: null,
        warning: 'Booking created but not synced to external system'
      };
    }
  } catch (error) {
    // Network error - retry
    console.error('ReserveGo API error:', error);
    return {
      success: false,
      error: 'Failed to process booking'
    };
  }
}
```

### Retry Logic for Failed API Calls
```typescript
// Cron job: Every 5 minutes
async function retryFailedBookings() {
  const failed = await db.akan_bookings.findMany({
    where: {
      reference_id: null,
      external_api_retry_count: { $lt: 3 }
    }
  });

  for (const booking of failed) {
    try {
      const result = await callReserveGoAPI(booking);
      if (result.code === 'SUCCESS') {
        await db.akan_bookings.update(booking.id, {
          reference_id: result._id,
          reservego_status: 1
        });
      } else {
        await db.akan_bookings.update(booking.id, {
          external_api_retry_count: booking.external_api_retry_count + 1
        });
      }
    } catch (error) {
      console.error(`Retry failed for booking ${booking.id}`, error);
    }
  }
}
```

---

## 📅 Implementation Timeline (20 Days)

| Phase | Days | What | Status |
|-------|------|------|--------|
| **1: Frontend Pages** | 5 | Landing, Event details, Booking form, Confirmation | Not started |
| **2: Admin Dashboard** | 4 | Events section, Bookings list, Abandoned forms | Not started |
| **3: API Routes** | 5 | All CRUD endpoints, ReserveGo integration | Not started |
| **4: Database** | 2 | Schema, Prisma setup, Migrations | Not started |
| **5: Email & Tracking** | 2 | Email templates, Abandoned form tracking | Not started |
| **6: Testing & Deploy** | 2 | Local testing, Production deployment | Not started |

---

## 🛠️ Tech Stack

```
Frontend:      Next.js 14 + React + TypeScript
Styling:       Tailwind CSS
Form State:    React Hook Form
Database:      PostgreSQL (self-hosted)
ORM:           Prisma
Email:         Nodemailer
API Client:    fetch / axios
Hosting:       Hostinger VPS
```

---

## ✅ Checklist Before We Start

- [x] Architecture confirmed (1 app, new dashboard section)
- [x] ReserveGo API details provided
- [x] Database schema designed
- [x] Abandoned form tracking defined
- [x] Email templates planned

### Ready to Start?

**PHASE 1: Frontend Pages** (Days 1-5)
- [ ] Initialize Next.js project
- [ ] Create landing page component
- [ ] Create event details page component
- [ ] Create booking form component
- [ ] Create confirmation page component
- [ ] Build API mock data

Should I begin Phase 1 now? 🚀

