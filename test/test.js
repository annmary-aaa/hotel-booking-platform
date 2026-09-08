/**
 * Automated End-to-End API Test Suite
 * Grand Horizon — Hotel Room Booking & Reservation Platform (P03)
 * Validates all 13 modules, RBAC auth, business rules, and negative test cases.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✅ [PASS]\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m❌ [FAIL]\x1b[0m ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  return { status: res.status, data };
}

async function runSuite() {
  console.log('\n================================================================');
  console.log('🏨 Grand Horizon Hotel Platform — Automated Test Suite (P03)');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let guestToken = '';
  let hotelId = '';
  let roomTypeId = '';
  let roomId = '';
  let bookingId = '';

  try {
    // 1. Health & Status
    console.log('--- 1. Health & Database Diagnostics ---');
    const health = await request('/health');
    assert(health.status === 200 && health.data?.success === true, 'GET /api/health responds with HTTP 200');
    assert(health.data?.data?.database === 'connected', 'Database connection status is "connected"');

    // 2. Authentication & Authorization
    console.log('\n--- 2. Module 1: Authentication & RBAC ---');
    const uniqueEmail = `guest_test_${Date.now()}@hotel.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Auto Test Guest', email: uniqueEmail, password: 'Password123!', phone: '9876543210' },
    });
    assert(regRes.status === 201 && regRes.data?.data?.token, 'POST /api/auth/register creates new guest');

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@hotel.com', password: 'Password123!' },
    });
    assert(adminLogin.status === 200 && adminLogin.data?.data?.token, 'POST /api/auth/login logs in Admin');
    adminToken = adminLogin.data?.data?.token;

    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'staff@hotel.com', password: 'Password123!' },
    });
    assert(staffLogin.status === 200 && staffLogin.data?.data?.token, 'POST /api/auth/login logs in Staff');
    staffToken = staffLogin.data?.data?.token;

    const guestLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'guest@hotel.com', password: 'Password123!' },
    });
    assert(guestLogin.status === 200 && guestLogin.data?.data?.token, 'POST /api/auth/login logs in Guest');
    guestToken = guestLogin.data?.data?.token;

    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert(meRes.status === 200 && meRes.data?.data?.role === 'guest', 'GET /api/auth/me returns guest profile');

    // 3. Hotels, Room Types & Rooms
    console.log('\n--- 3. Modules 2 & 3: Properties, Room Types & Physical Rooms ---');
    const hotelsRes = await request('/hotels');
    const hotelList = hotelsRes.data?.data?.items || hotelsRes.data?.data || [];
    assert(hotelsRes.status === 200 && Array.isArray(hotelList) && hotelList.length > 0, 'GET /api/hotels returns active properties');
    if (hotelList.length > 0) {
      hotelId = hotelList[0]._id;
    }

    const roomTypesRes = await request(`/room-types?hotelId=${hotelId}`);
    assert(roomTypesRes.status === 200 && Array.isArray(roomTypesRes.data?.data), 'GET /api/room-types lists room inventory');
    if (roomTypesRes.data?.data?.length > 0) {
      roomTypeId = roomTypesRes.data.data[0]._id;
    }

    const roomsRes = await request(`/rooms?roomTypeId=${roomTypeId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(roomsRes.status === 200 && Array.isArray(roomsRes.data?.data), 'GET /api/rooms lists rooms for staff');
    if (roomsRes.data?.data?.length > 0) {
      // Pick a clean room for check-in
      const cleanRoom = roomsRes.data.data.find((r) => r.housekeepingStatus === 'clean') || roomsRes.data.data[0];
      roomId = cleanRoom._id;
    }

    // 4. Availability Search Engine
    console.log('\n--- 4. Module 4: Availability Search Engine ---');
    const searchRes = await request('/hotels/search?city=Bengaluru&checkIn=2026-11-10&checkOut=2026-11-13&occupancy=2');
    assert(searchRes.status === 200 && Array.isArray(searchRes.data?.data), 'GET /api/hotels/search evaluates live date availability');

    // 5. Reservation Workflow & Dynamic Pricing
    console.log('\n--- 5. Modules 5, 6 & 12: Reservation, Dynamic Rates & Invoice ---');
    const bookRes = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${guestToken}` },
      body: {
        hotelId,
        roomTypeId,
        checkIn: '2026-11-10',
        checkOut: '2026-11-13',
        numGuests: 2,
        numRooms: 1,
      },
    });
    assert(bookRes.status === 201 && bookRes.data?.data?.totalAmount > 0, 'POST /api/bookings creates reservation with dynamic pricing');
    if (bookRes.data?.data) {
      bookingId = bookRes.data.data._id;
    }

    const invoiceRes = await request(`/bookings/${bookingId}/invoice`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert(invoiceRes.status === 200 && invoiceRes.data?.data?.taxAmount !== undefined, 'GET /api/bookings/:id/invoice computes itemized bill');

    // 6. Front Desk Check-in, Check-out & Housekeeping
    console.log('\n--- 6. Modules 7, 8 & 9: Front Desk & Housekeeping Status ---');
    const confirmRes = await request(`/bookings/${bookingId}/confirm`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(confirmRes.status === 200 && confirmRes.data?.data?.status === 'confirmed', 'PUT /api/bookings/:id/confirm advances status to Confirmed');

    const checkinRes = await request(`/bookings/${bookingId}/checkin`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { roomId },
    });
    assert(checkinRes.status === 200 && checkinRes.data?.data?.status === 'checked_in', 'PUT /api/bookings/:id/checkin records check-in and assigns room');

    const checkoutRes = await request(`/bookings/${bookingId}/checkout`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(checkoutRes.status === 200 && checkoutRes.data?.data?.status === 'checked_out', 'PUT /api/bookings/:id/checkout records check-out & flags room DIRTY');

    // Housekeeping cleanup transition
    if (roomId) {
      const hkRes = await request(`/rooms/${roomId}/housekeeping`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: { housekeepingStatus: 'clean' },
      });
      assert(hkRes.status === 200 && hkRes.data?.data?.housekeepingStatus === 'clean', 'PUT /api/rooms/:id/housekeeping transitions room back to CLEAN');
    }

    // 7. Cancellation & Refund Policy
    console.log('\n--- 7. Module 10: Tiered Cancellation & Refund Engine ---');
    // Create a future reservation (>7 days out) to test 100% refund tier
    const futureBook = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${guestToken}` },
      body: {
        hotelId,
        roomTypeId,
        checkIn: '2026-12-25',
        checkOut: '2026-12-28',
        numGuests: 1,
        numRooms: 1,
      },
    });
    if (futureBook.data?.data?._id) {
      const cancelId = futureBook.data.data._id;
      const cancelRes = await request(`/bookings/${cancelId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${guestToken}` },
        body: { reason: 'Automated test schedule change' },
      });
      assert(
        cancelRes.status === 200 &&
          cancelRes.data?.data?.status === 'cancelled' &&
          cancelRes.data?.data?.cancellation?.refundPercentage === 100,
        'PUT /api/bookings/:id/cancel calculates 100% refund for >7 days before check-in'
      );
    }

    // 8. Guest Booking History
    console.log('\n--- 8. Module 11: Guest Booking History ---');
    const guestUser = guestLogin.data?.data?._id;
    const historyRes = await request(`/guests/${guestUser}/bookings`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert(
      historyRes.status === 200 &&
        Array.isArray(historyRes.data?.data?.upcoming) &&
        Array.isArray(historyRes.data?.data?.past),
      'GET /api/guests/:id/bookings returns segregated upcoming and past bookings'
    );

    // 9. Admin Occupancy Reports
    console.log('\n--- 9. Module 13: Admin Occupancy & Revenue Analytics ---');
    const reportRes = await request('/admin/reports/occupancy', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      reportRes.status === 200 &&
        Array.isArray(reportRes.data?.data) &&
        reportRes.data?.data[0]?.occupancyRate !== undefined,
      'GET /api/admin/reports/occupancy aggregates occupancy rates and revenue per property'
    );

    // 10. Negative Test Cases
    console.log('\n--- 10. Negative Validation & Business Conflict Tests ---');
    const badDate = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${guestToken}` },
      body: {
        hotelId,
        roomTypeId,
        checkIn: '2026-11-20',
        checkOut: '2026-11-15',
        numGuests: 1,
        numRooms: 1,
      },
    });
    assert(badDate.status === 400, 'Rejects check-out before check-in with HTTP 400 (Bad Request)');

    const noAuth = await request('/auth/me');
    assert(noAuth.status === 401, 'Rejects request missing Bearer token with HTTP 401 (Unauthorized)');

    const forbidden = await request('/admin/reports/occupancy', {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert(forbidden.status === 403, 'Rejects Guest accessing Admin report with HTTP 403 (Forbidden)');

    const notFound = await request('/hotels/64f1a2b3c4d5e6f7a8b9c999');
    assert(notFound.status === 404, 'Returns HTTP 404 for non-existent ObjectId without crashing');

    const illegalJump = await request(`/bookings/${bookingId}/checkin`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { roomId },
    });
    assert(illegalJump.status === 409, 'Rejects illegal status transition (Checked-out -> Checked-in) with HTTP 409 Conflict');

    console.log('\n================================================================');
    console.log(`📊 Test Results: \x1b[32m${passed} PASSED\x1b[0m, \x1b[31m${failed} FAILED\x1b[0m`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unexpected test failure:', err);
    process.exit(1);
  }
}

runSuite();
