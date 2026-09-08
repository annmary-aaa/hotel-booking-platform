# Grand Horizon — Hotel Room Booking & Reservation Platform

**CIA-3 Project (P03) — 5th Semester, Christ University**

A Node.js + Express + MongoDB backend for a multi-property hotel chain: guests search
availability and book rooms, hotel staff manage inventory, check-in/check-out and
housekeeping, and admins manage properties, pricing and occupancy reporting. A simple
HTML/CSS/JS frontend is included so the API can be demoed live in a browser as well as
via Postman.

---

## Team Details

| Name | Roll No | Department | Section |
|---|---|---|---|
| _fill in_ | _fill in_ | _fill in_ | _fill in_ |
| _fill in_ | _fill in_ | _fill in_ | _fill in_ |
| _fill in_ | _fill in_ | _fill in_ | _fill in_ |

---

## Problem Statement

Independent hotel chains need a reliable way to expose room availability across several
properties, take reservations without double-booking, apply seasonal/weekend pricing,
and let front-desk staff manage the physical realities of running a hotel — check-ins,
check-outs, and housekeeping — while admins track occupancy and revenue. This project
implements that as a role-based REST API on top of MongoDB, with real business-rule
validation (not just CRUD) at every step of a booking's lifecycle.

---

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Database:** MongoDB with Mongoose ODM
- **Auth:** Self-built JWT flow, passwords hashed with bcrypt
- **Validation:** Joi (all request bodies validated before hitting business logic)
- **Docs/Testing:** Postman collection (`postman_collection.json`)
- **Frontend (optional, included):** Plain HTML/CSS/JavaScript, no build step

---

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the example file and fill in your own values:
```bash
cp .env.example .env
```
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/hotel_booking_platform
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=7d
TAX_RATE=0.12
```
`.env` is git-ignored — never commit real secrets or DB URIs to the repository.

### 4. (Optional) Seed demo data
Creates one admin, one staff member, one guest, a hotel with two room types, physical
rooms, and two pricing rules:
```bash
npm run seed
```
Login credentials after seeding (password for all: `Password123!`):
- `admin@hotel.com` (admin)
- `staff@hotel.com` (staff)
- `guest@hotel.com` (guest)

### 5. Run the server
```bash
npm start          # production-style start
npm run dev         # auto-restart with nodemon during development
```
The API is available at `http://localhost:5000/api`, and the demo frontend at
`http://localhost:5000`.

### 6. Import the Postman collection
Import `postman_collection.json` into Postman. It uses a collection variable `baseUrl`
(default `http://localhost:5000/api`) and `token` (set automatically by the Login
request's test script). Run **Auth → Login** first, then everything else will pick up
the saved token automatically.

---

## List of Implemented Modules

| # | Module | Where it lives |
|---|---|---|
| 1 | Guest Registration & Authentication | `controllers/authController.js`, `routes/authRoutes.js` |
| 2 | Hotel & Property Management | `controllers/hotelController.js`, `routes/hotelRoutes.js` |
| 3 | Room Type & Inventory Management | `controllers/roomTypeController.js`, `controllers/roomController.js` |
| 4 | Availability Search Engine | `controllers/availabilityController.js`, `utils/availability.js` |
| 5 | Reservation Booking Workflow | `controllers/bookingController.js` (`createBooking`) |
| 6 | Dynamic Pricing Rules | `controllers/pricingController.js`, `utils/pricingEngine.js` |
| 7 | Booking Status Management | `controllers/bookingController.js` (`confirmBooking`, status history) |
| 8 | Check-in / Check-out Module | `controllers/bookingController.js` (`checkinBooking`, `checkoutBooking`) |
| 9 | Housekeeping Status Tracking | `controllers/roomController.js` (`updateHousekeepingStatus`) |
| 10 | Cancellation & Refund Policy Engine | `controllers/bookingController.js` (`cancelBooking`), `utils/cancellationPolicy.js` |
| 11 | Guest Booking History | `controllers/bookingController.js` (`getGuestBookingHistory`) |
| 12 | Invoice Generation Summary | `controllers/bookingController.js` (`getInvoice`) |
| 13 | Admin Occupancy Reports | `controllers/reportController.js` |

All 13 required modules are implemented and working end-to-end, not stubbed.

---

## API Endpoint Reference

Full details (bodies, headers, sample responses) are in the Postman collection.
Summary:

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a guest account |
| POST | `/api/auth/login` | Public | Log in, returns a JWT |
| GET | `/api/auth/me` | Authenticated | Get the logged-in user's profile |

### Hotels & Search
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/hotels/search` | Public | Search availability by city/hotel, dates, occupancy |
| POST | `/api/hotels` | Admin | Create a hotel property |
| GET | `/api/hotels` | Public | List hotels (paginated) |
| GET | `/api/hotels/:id` | Public | Get one hotel |
| PUT | `/api/hotels/:id` | Admin | Update a hotel |
| DELETE | `/api/hotels/:id` | Admin | Deactivate a hotel (soft delete) |

### Room Types & Rooms
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/room-types` | Admin | Create a room type (auto-generates its rooms) |
| GET | `/api/room-types` | Public | List room types (filter by `hotelId`) |
| GET | `/api/room-types/:id` | Public | Get one room type |
| PUT | `/api/room-types/:id` | Admin | Update a room type |
| DELETE | `/api/room-types/:id` | Admin | Delete a room type and its rooms |
| POST | `/api/rooms` | Admin | Add an extra physical room |
| GET | `/api/rooms` | Staff/Admin | List rooms (filter by `roomTypeId`, `housekeepingStatus`) |
| PUT | `/api/rooms/:id/housekeeping` | Staff/Admin | Update a room's housekeeping status |

### Pricing Rules
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/pricing-rules` | Admin | Create a seasonal/weekend pricing rule |
| GET | `/api/pricing-rules` | Public | List rules (filter by `roomTypeId`) |
| PUT | `/api/pricing-rules/:id` | Admin | Update a rule |
| DELETE | `/api/pricing-rules/:id` | Admin | Delete a rule |

### Bookings
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/bookings` | Guest | Create a reservation (validates availability + computes price) |
| GET | `/api/bookings` | Staff/Admin | List all bookings (filter by `status`, `hotelId`) |
| GET | `/api/bookings/:id` | Owner/Staff/Admin | Get one booking |
| GET | `/api/bookings/:id/invoice` | Owner/Staff/Admin | Get the computed invoice |
| PUT | `/api/bookings/:id/confirm` | Staff/Admin | Reserved → Confirmed |
| PUT | `/api/bookings/:id/checkin` | Staff/Admin | Confirmed → Checked-in (assigns a room) |
| PUT | `/api/bookings/:id/checkout` | Staff/Admin | Checked-in → Checked-out |
| PUT | `/api/bookings/:id/cancel` | Owner/Staff/Admin | Cancel + compute refund |
| GET | `/api/guests/:id/bookings` | Owner/Staff/Admin | Booking history (upcoming/past) |

### Admin
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/admin/reports/occupancy` | Staff/Admin | Occupancy rate & revenue per property |

---

## Database Schema Summary

| Collection | Key Fields | Relationship |
|---|---|---|
| `users` | name, email, passwordHash, role | Referenced by hotels (createdBy), bookings (guestId) |
| `hotels` | name, city, amenities[] (embedded), rating, createdBy (ref) | One-to-many with roomTypes |
| `roomTypes` | hotelId (ref), name, basePrice, totalRooms, capacity | One-to-many with rooms, pricingRules, bookings |
| `rooms` | roomTypeId (ref), roomNumber, housekeepingStatus | Assigned to a booking at check-in |
| `bookings` | guestId/hotelId/roomTypeId/roomId (refs), checkIn, checkOut, status, statusHistory[] (embedded), totalAmount, cancellation | Central transactional collection |
| `pricingRules` | roomTypeId (ref), season, ruleType, startDate, endDate, multiplier | Read at booking time and search time |

**Reference vs. embed reasoning:** `amenities` on `hotels` and `statusHistory` on
`bookings` are embedded because they are small, always read together with their
parent, and never queried independently. Every other relationship (`hotelId`,
`roomTypeId`, `roomId`, `guestId`, `createdBy`) is a reference, because those
collections are large, shared across many parent documents, and updated
independently of one another (e.g. a room's housekeeping status changes constantly
without touching its room type).

---

## Business Rules Implemented (beyond plain CRUD)

- **No double-booking:** `utils/availability.js` sums `numRooms` across all
  overlapping active bookings for a room type and rejects a reservation
  (`409 AVAILABILITY_CONFLICT`) if not enough rooms remain.
- **Dynamic pricing:** `utils/pricingEngine.js` walks the stay night-by-night,
  applying the first matching seasonal rule, else a weekend rule (Fri/Sat nights),
  else the base price.
- **Booking status lifecycle:** `reserved → confirmed → checked_in → checked_out`,
  with `cancelled` reachable from `reserved`/`confirmed` only. Every transition is
  validated server-side (`409 INVALID_STATUS_TRANSITION` on an illegal jump) and
  recorded in an embedded `statusHistory` array.
- **Room readiness check:** check-in is refused (`409 ROOM_NOT_READY`) unless the
  assigned room's housekeeping status is `clean` or `inspected`.
- **Cancellation & refund tiers:** `utils/cancellationPolicy.js` — 100% refund at
  7+ days before check-in, 50% at 3–6 days, 0% inside 3 days.
- **Role/ownership checks:** guests can only see/cancel their own bookings; only
  staff/admin can confirm, check-in, check-out, or run reports.

---

## Known Limitations

- Payment gateways, SMS/email notifications, and maps are out of scope (mocked/omitted)
  per the project brief; a booking's `totalAmount` is computed but no payment capture
  happens.
- Single currency (₹) and single time zone are assumed.
- The frontend is a minimal demo UI for showing the API live; it is not the graded
  deliverable and intentionally keeps interactions simple (e.g. staff enter a Room ID
  by hand at check-in rather than picking from a visual room-map).
- Room assignment at check-in requires the staff member to know/paste a Room ID
  (visible via the "Load rooms" panel in the Front Desk view, or `GET /api/rooms`).

---

## Project Folder Structure

```
hotel-booking-platform/
  config/          db.js (MongoDB connection)
  models/          Mongoose schemas (one file per collection)
  routes/          Express route definitions, grouped by resource
  controllers/     business logic for each route
  middleware/      auth.js (JWT verify + role check), validate.js, errorHandler.js
  validators/      Joi schemas per resource
  utils/           token, pagination, pricingEngine, cancellationPolicy,
                   availability, asyncHandler, ApiError, seed.js
  public/          demo frontend (index.html, css/, js/)
  .env.example
  server.js
  package.json
  postman_collection.json
  README.md
```

---

## Suggested Postman Testing Checklist

- **Happy path:** register a guest, log in, search availability, create a booking.
- **Validation failure:** POST `/api/bookings` with `checkOut` before `checkIn` → clean `400`.
- **Authentication failure:** call `/api/bookings` (list) without a token → `401`.
- **Authorization failure:** call `/api/hotels` (POST) with a guest token → `403`.
- **Business-rule conflict:** book the last available room twice for the same dates →
  the second request returns `409 AVAILABILITY_CONFLICT`, not a silent double-booking.
- **Not-found case:** GET `/api/bookings/000000000000000000000000` → clean `404`, no crash.

---

## Deliverables Checklist

- [x] Complete Node.js + Express.js + MongoDB source code
- [x] README.md with setup instructions and API reference (this file)
- [x] Postman collection (`postman_collection.json`)
- [x] Simple HTML/CSS/JS frontend demonstrating the APIs live
- [ ] Code screenshots and output/result screenshots for the PDF report and PPT
- [ ] PPT presentation
- [ ] Working demo / recorded walkthrough
- [ ] Team Details page as the first page of the submission PDF

Push this project to a GitHub repository, add screenshots as you test each module in
Postman/the browser, and fill in the team details table above before submission.
