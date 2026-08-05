# Akan Events: Implementation Analysis & Plan

## 📊 Architecture Overview

You have **3 different systems** that need to work together:

```
1. EXISTING DASHBOARD (event dashboard/)
   └─ Purpose: Venue operations (covers, wallets, tickets, tables, cashier)
   └─ Keep: AS-IS (no changes needed)
   
2. AKAN EVENTS (NEW - what we're building)
   └─ Landing page: events.akanhyd.com/
   └─ Event details: events.akanhyd.com/event/[id]
   └─ Admin: Create/edit/manage events (NEW simple section)
   └─ Purpose: Brunch, workshops, live music EXPERIENCES (not venue covers)
   
3. EXTERNAL RESERVATIONS API (your existing system)
   └─ When booking comes in → Push to external API
   └─ All booking data syncs there
```

---

## 🔍 Field Analysis: Existing Dashboard vs. Akan Events

### Existing Dashboard Event Fields (Venue Operations)
```
- name, event_date, status
- base_entry_fee, cover_policy, cover_value
- pax_rules (min/max party size rules)
- cutoff_hour
- entry_fee_per_person, cover_male_stag, cover_female_stag, cover_couple
- table_types, occupancy_rule, gst_percent, discount_percent
- booking_types (tickets with prices)
- venue_id, artist_ids
- terms, faqs
- messages_config (WhatsApp integration)
```

✅ **What it does:** Manage cover charges, table reservations, gender-based pricing

---

### Akan Events Fields (Experience Sales)
```
Currently in prototype (data.js):
- id, kind (Workshop, Brunch, Live Band, DJ Night)
- title, tagline, date, time
- price, image, hue (color theme)
- featured (boolean), note (Local favourite, Headliner, Selling fast)
- body (description), tags
```

✅ **What it does:** Sell experiences like workshops, brunches, live music events

---

## ❌ **Fields MISSING in Existing Dashboard (For Akan Events)**

| Field | Akan Events Needs | Why | Solution |
|-------|------------------|-----|----------|
| `kind` | Workshop, Brunch, Live Band, DJ Night | Categorize event type | Add dropdown field |
| `tagline` | Short catchy line | Marketing/display | Add text field |
| `hue` | Color theme (sunny, tomato, crimson) | Visual theming | Add color dropdown |
| `featured` | Boolean flag | Featured events on home | Add toggle |
| `note` | Badge text (Headliner, Selling fast) | Urgency/badge | Add text field |
| `time` | "9:00 PM — 12:30 AM" | Time range | Add start/end time |
| `capacity` | Number of seats | Booking limit | Add number field |
| `description` | Rich body text | Event details | Add text area |

---

## ✅ **What We're Building**

### Frontend (Public Site)
```
1. Landing Page (/)
   ├─ Header with logo + scroll detection
   ├─ "Day Events" section (grid of brunch/workshops)
   ├─ "Night Events" section (grid of live music/DJ)
   ├─ Event cards (clickable)
   ├─ Sticky CTA button
   └─ Footer

2. Event Details (/event/[id])
   ├─ Hero image + poster
   ├─ Event info (date, time, price, tags)
   ├─ Description + Body text
   ├─ Booking form (sticky on desktop)
   ├─ Countdown timer
   ├─ Venue map
   ├─ FAQ section
   └─ Similar events

3. Booking Confirmation (/event/[id]/confirmation)
   ├─ Booking reference
   ├─ Event details
   ├─ Guest details
   ├─ QR code
   └─ Email confirmation link
```

### Admin Backend (Simple Event Management)
```
Where: In the EXISTING dashboard OR as new section
- /dashboard/events (NEW)
  ├─ Create Event form (with all fields)
  ├─ Event list (edit/delete)
  └─ Event visibility toggle

Fields in form:
  ✓ Title, Tagline, Description
  ✓ Kind (dropdown: Workshop, Brunch, Live Band, DJ)
  ✓ Date & Time (start/end)
  ✓ Price
  ✓ Image URL
  ✓ Hue (color theme)
  ✓ Capacity
  ✓ Tags (multi-select)
  ✓ Featured (toggle)
  ✓ Note (badge text)
```

### Database (New Simple Table)
```
akan_events table:
  - id (UUID)
  - title, tagline, kind
  - description, body (full text)
  - date, time_start, time_end
  - price
  - image_url, hue
  - capacity, booked (counter)
  - featured (boolean)
  - note (badge text)
  - tags (JSON array)
  - status (active/archived)
  - created_at, updated_at

akan_bookings table:
  - id (UUID)
  - event_id (FK)
  - name, email, mobile
  - pax (party size)
  - payment_method (hold/upi/card)
  - paid (boolean)
  - status (pending/confirmed/completed)
  - reference_id (external API reference)
  - created_at, updated_at
```

---

## 🔌 **Integration Points**

### Booking Flow
```
Guest fills booking form
    ↓
Save to akan_bookings table
    ↓
Push to EXTERNAL API (you provide endpoint)
    ↓
Display confirmation page
    ↓
Send email to guest
```

### Admin Dashboard Integration
```
Admin logs in (EXISTING auth)
    ↓
Navigate to "Events" section (NEW)
    ↓
Create/Edit/Delete events
    ↓
Events appear on landing page immediately
    ↓
View bookings (NEW)
```

---

## 📋 **Execution Plan (Simple Steps)**

### STEP 1: Build Frontend Pages (Days 1-5)
Start with the **public-facing pages first** (no admin needed):

```
✓ Landing page (/): Shows all events
✓ Event details (/event/[id]): Full event page + booking form
✓ Booking confirmation: Success page + email sent
✓ Responsive design (mobile + desktop)
```

**What you need:**
- React components (reuse from prototype)
- Tailwind CSS styling
- Basic API call to fetch events (mock for now)

---

### STEP 2: Create Event Management Form (Days 6-8)
Add simple **event creation** to dashboard:

```
✓ Event form with all fields
✓ List events (edit/delete buttons)
✓ Image upload
✓ Tags multi-select
✓ Save to database
```

**Fields to include:**
- ✅ Title, Tagline, Kind
- ✅ Date & Time (start/end)
- ✅ Price, Capacity
- ✅ Description, Body text
- ✅ Image, Hue (color)
- ✅ Tags, Featured toggle, Note

---

### STEP 3: Booking Management (Days 9-10)
Add bookings list to admin:

```
✓ View all bookings (table with filters)
✓ See booking details
✓ Mark as confirmed/paid
✓ Send reminder email
✓ Export to CSV
```

---

### STEP 4: External API Integration (Days 11-12)
When booking comes in:

```
✓ Save to akan_bookings table
✓ Call external API (endpoint you provide)
✓ Store external reference ID
✓ Retry on failure
```

---

### STEP 5: Testing & Deployment (Days 13-14)
```
✓ Test landing page
✓ Test booking flow
✓ Test admin dashboard
✓ Test email confirmations
✓ Deploy to Hostinger VPS
```

---

## 🎯 **My Recommendation**

### Option 1: Separate Admin Section (Recommended)
```
Keep existing dashboard UNTOUCHED for venue operations
Create NEW "Events" menu item for Akan Events
URL: /dashboard/events (in same app)
├─ Create/Edit events (simple form)
├─ View bookings
└─ Simple analytics
```
✅ Pros: Clean separation, less confusion
❌ Cons: Two different event systems in one app

---

### Option 2: Extend Existing Dashboard
```
Add new event type to existing dashboard
Adapt the forms for Akan Events
Mix with existing venue events
```
❌ Pros: Single event management
❌ Cons: Too complex, will confuse venue operations

---

## 📝 **What Needs the API Details You Mentioned**

When you provide the external reservations API details, I need:
```
1. API endpoint URL
   Example: https://reservations.akanhyd.com/api/bookings

2. Authentication method
   Example: API key, Bearer token, etc.

3. Request format (what data to send)
   Example: 
   {
     "event_id": "band-infusion",
     "guest_name": "Rohit Kumar",
     "email": "rohit@example.com",
     "mobile": "+919999999999",
     "pax": 4,
     "payment_method": "hold"
   }

4. Response format (what you expect back)
   Example:
   {
     "success": true,
     "reference_id": "RES-12345",
     "status": "pending"
   }
```

---

## 🚀 **Next Steps**

### Ready to Start?

1. **Which option do you prefer?**
   - Option 1: New "Events" section in dashboard (recommended)
   - Option 2: Single events management

2. **Can you provide:**
   - External API endpoint URL
   - Authentication details
   - Expected request/response format

3. **Then I'll start with PHASE 1:**
   - Set up Next.js project structure
   - Create landing page component
   - Create event details page component
   - Build booking form
   - Create database schema (akan_events + akan_bookings)

---

## 📊 **Field Checklist for Event Creation Form**

When you want to create an event from admin, these are ALL the fields needed:

```
BASIC INFO:
  ☐ Title (required)
  ☐ Tagline (required) 
  ☐ Kind (dropdown: Workshop, Brunch, Live Band, DJ Night, etc.)
  ☐ Description (rich text area)

SCHEDULING:
  ☐ Date (date picker)
  ☐ Start Time (time picker)
  ☐ End Time (time picker)

PRICING & CAPACITY:
  ☐ Price (text: "₹1,950++ per person")
  ☐ Capacity (number)

MEDIA & APPEARANCE:
  ☐ Image URL (or file upload)
  ☐ Hue / Color Theme (dropdown: sunny, tomato, crimson, etc.)

TAGS & FEATURES:
  ☐ Tags (multi-select: Live acoustic, Bottomless pours, etc.)
  ☐ Featured (toggle: yes/no)
  ☐ Note / Badge (text: "Local favourite", "Headliner", "Selling fast")

VISIBILITY:
  ☐ Status (active/draft/archived)
```

✅ **All fields present?** Check!
❌ **Any missing?** Let me know which ones!

