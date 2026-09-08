// ---------- Toast ----------
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3200);
}

// ---------- View switching ----------
function switchView(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));

  if (view === 'bookings') loadMyBookings();
  if (view === 'staff') { loadStaffBookings(); }
  if (view === 'admin') { /* forms are empty by default */ }
}

document.getElementById('navTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  switchView(btn.dataset.view);
});

// ---------- Auth UI ----------
function refreshAuthUI() {
  const user = getUser();
  const greeting = document.getElementById('userGreeting');
  const loginBtn = document.getElementById('loginOpenBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const staffTab = document.getElementById('staffTabBtn');
  const adminTab = document.getElementById('adminTabBtn');

  if (user) {
    greeting.hidden = false;
    greeting.textContent = `${user.name} · ${user.role}`;
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    staffTab.hidden = !(user.role === 'staff' || user.role === 'admin');
    adminTab.hidden = user.role !== 'admin';
  } else {
    greeting.hidden = true;
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    staffTab.hidden = true;
    adminTab.hidden = true;
  }
}

document.getElementById('loginOpenBtn').addEventListener('click', () => {
  document.getElementById('authModal').hidden = false;
});
document.getElementById('modalCloseBtn').addEventListener('click', () => {
  document.getElementById('authModal').hidden = true;
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  refreshAuthUI();
  showToast('Logged out');
  switchView('search');
});

document.querySelectorAll('.modal-tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.modal-form').forEach((f) => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.form}Form`).classList.add('active');
    document.getElementById('authError').textContent = '';
  });
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('l-email').value;
  const password = document.getElementById('l-password').value;
  try {
    const data = await api.login({ email, password });
    setSession({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
    document.getElementById('authModal').hidden = true;
    refreshAuthUI();
    showToast(`Welcome back, ${data.name}`, 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('r-name').value;
  const email = document.getElementById('r-email').value;
  const password = document.getElementById('r-password').value;
  try {
    const data = await api.register({ name, email, password });
    setSession({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
    document.getElementById('authModal').hidden = true;
    refreshAuthUI();
    showToast(`Account created. Welcome, ${data.name}`, 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  }
});

// ---------- Search & book ----------
let lastSearchResults = [];

document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById('searchStatus');
  const resultsEl = document.getElementById('searchResults');
  statusEl.className = 'status-line';
  statusEl.textContent = 'Searching…';
  resultsEl.innerHTML = '';

  const params = {
    checkIn: document.getElementById('s-checkin').value,
    checkOut: document.getElementById('s-checkout').value,
    occupancy: document.getElementById('s-occupancy').value || 1,
  };
  const city = document.getElementById('s-city').value;
  if (city) params.city = city;

  try {
    const results = await api.searchAvailability(params);
    lastSearchResults = results;
    statusEl.textContent = results.length
      ? `${results.length} room type(s) available.`
      : 'No availability found for those dates. Try different dates or city.';
    renderResults(results, params);
  } catch (err) {
    statusEl.className = 'status-line error';
    statusEl.textContent = err.message;
  }
});

function renderResults(results, params) {
  const resultsEl = document.getElementById('searchResults');
  resultsEl.innerHTML = results.map((r, idx) => `
    <div class="result-card">
      <h4>${r.hotel.name}</h4>
      <div class="location">${r.hotel.city} · ${r.roomType.name} · sleeps ${r.roomType.capacity}</div>
      <div class="price">₹${r.priceQuotePerRoom.totalAmount.toLocaleString()} <small>/ room, incl. tax, ${r.priceQuotePerRoom.nights} night(s)</small></div>
      <div class="meta">${r.availableCount} room(s) left · base ₹${r.roomType.basePrice}/night</div>
      <button class="btn btn-primary" data-idx="${idx}">Reserve</button>
    </div>
  `).join('');

  resultsEl.querySelectorAll('button[data-idx]').forEach((btn) => {
    btn.addEventListener('click', () => bookRoom(results[btn.dataset.idx], params));
  });
}

async function bookRoom(result, params) {
  const user = getUser();
  if (!user) {
    showToast('Please log in as a guest to book a room.', 'error');
    document.getElementById('authModal').hidden = false;
    return;
  }
  if (user.role !== 'guest') {
    showToast('Only guest accounts can create bookings.', 'error');
    return;
  }

  try {
    await api.createBooking({
      hotelId: result.hotel._id,
      roomTypeId: result.roomType._id,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      numGuests: Number(params.occupancy) || 1,
      numRooms: 1,
    });
    showToast('Booking reserved! Check "My bookings".', 'success');
    switchView('bookings');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- My bookings ----------
async function loadMyBookings() {
  const user = getUser();
  const statusEl = document.getElementById('bookingsStatus');
  const upcomingEl = document.getElementById('upcomingBookings');
  const pastEl = document.getElementById('pastBookings');
  upcomingEl.innerHTML = '';
  pastEl.innerHTML = '';

  if (!user) {
    statusEl.textContent = 'Log in to see your bookings.';
    return;
  }
  statusEl.textContent = 'Loading…';

  try {
    const { upcoming, past } = await api.myBookings(user._id);
    statusEl.textContent = '';
    upcomingEl.innerHTML = upcoming.length ? upcoming.map(bookingCard).join('') : '<p>No upcoming stays.</p>';
    pastEl.innerHTML = past.length ? past.map(bookingCard).join('') : '<p>Nothing here yet.</p>';
    attachBookingActions();
  } catch (err) {
    statusEl.className = 'status-line error';
    statusEl.textContent = err.message;
  }
}

function bookingCard(b) {
  const checkIn = new Date(b.checkIn).toLocaleDateString();
  const checkOut = new Date(b.checkOut).toLocaleDateString();
  const canCancel = ['reserved', 'confirmed'].includes(b.status);
  return `
    <div class="booking-card status-${b.status}" data-id="${b._id}">
      <div class="row">
        <strong>${b.hotelId?.name || 'Hotel'}</strong>
        <span class="badge">${b.status.replace('_', ' ')}</span>
      </div>
      <div class="dates">${b.roomTypeId?.name || ''} · ${checkIn} → ${checkOut}</div>
      <div class="dates">Total: ₹${b.totalAmount.toLocaleString()}</div>
      ${canCancel ? `<div class="actions"><button class="btn-small danger" data-action="cancel" data-id="${b._id}">Cancel</button></div>` : ''}
    </div>
  `;
}

function attachBookingActions() {
  document.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this booking? Refund follows the cancellation policy.')) return;
      try {
        await api.cancelBooking(btn.dataset.id, 'Cancelled by guest via app');
        showToast('Booking cancelled.', 'success');
        loadMyBookings();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ---------- Staff / front desk ----------
async function loadStaffBookings() {
  const listEl = document.getElementById('staffBookingsList');
  const status = document.getElementById('staffStatusFilter').value;
  listEl.innerHTML = 'Loading…';
  try {
    const { items } = await api.listAllBookings(status);
    listEl.innerHTML = items.length ? items.map(staffBookingCard).join('') : '<p>No bookings found.</p>';
    attachStaffActions();
  } catch (err) {
    listEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
}

function staffBookingCard(b) {
  const checkIn = new Date(b.checkIn).toLocaleDateString();
  const checkOut = new Date(b.checkOut).toLocaleDateString();
  let actions = '';
  if (b.status === 'reserved') {
    actions += `<button class="btn-small success" data-action="confirm" data-id="${b._id}">Confirm</button>`;
  }
  if (['reserved', 'confirmed'].includes(b.status)) {
    actions += `<button class="btn-small" data-action="checkin" data-id="${b._id}">Check in…</button>`;
  }
  if (b.status === 'checked_in') {
    actions += `<button class="btn-small" data-action="checkout" data-id="${b._id}">Check out</button>`;
  }
  return `
    <div class="booking-card status-${b.status}">
      <div class="row">
        <strong>${b.guestId?.name || 'Guest'}</strong>
        <span class="badge">${b.status.replace('_', ' ')}</span>
      </div>
      <div class="dates">${b.hotelId?.name || ''} · ${b.roomTypeId?.name || ''}</div>
      <div class="dates">${checkIn} → ${checkOut} · ₹${b.totalAmount.toLocaleString()}</div>
      <div class="actions">${actions}</div>
    </div>
  `;
}

function attachStaffActions() {
  document.querySelectorAll('[data-action="confirm"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try { await api.confirmBooking(btn.dataset.id); showToast('Confirmed.', 'success'); loadStaffBookings(); }
      catch (err) { showToast(err.message, 'error'); }
    });
  });
  document.querySelectorAll('[data-action="checkin"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const roomId = prompt('Enter the Room ID to assign for check-in:');
      if (!roomId) return;
      try { await api.checkinBooking(btn.dataset.id, roomId); showToast('Checked in.', 'success'); loadStaffBookings(); }
      catch (err) { showToast(err.message, 'error'); }
    });
  });
  document.querySelectorAll('[data-action="checkout"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try { await api.checkoutBooking(btn.dataset.id); showToast('Checked out.', 'success'); loadStaffBookings(); }
      catch (err) { showToast(err.message, 'error'); }
    });
  });
}

document.getElementById('staffRefreshBtn').addEventListener('click', loadStaffBookings);
document.getElementById('staffStatusFilter').addEventListener('change', loadStaffBookings);

document.getElementById('hkRefreshBtn').addEventListener('click', async () => {
  const roomTypeId = document.getElementById('hkRoomTypeId').value.trim();
  const listEl = document.getElementById('roomsList');
  listEl.innerHTML = 'Loading…';
  try {
    const rooms = await api.listRooms(roomTypeId);
    listEl.innerHTML = rooms.length ? rooms.map(roomRow).join('') : '<p>No rooms found.</p>';
    attachRoomActions();
  } catch (err) {
    listEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
});

function roomRow(r) {
  return `
    <div class="room-row">
      <span>${r.roomNumber} <code style="color:#8a8471">${r._id}</code></span>
      <select data-room-id="${r._id}">
        ${['clean', 'dirty', 'inspected', 'out_of_service'].map((s) =>
          `<option value="${s}" ${s === r.housekeepingStatus ? 'selected' : ''}>${s.replace('_', ' ')}</option>`
        ).join('')}
      </select>
    </div>
  `;
}

function attachRoomActions() {
  document.querySelectorAll('select[data-room-id]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try {
        await api.updateHousekeeping(sel.dataset.roomId, sel.value);
        showToast('Housekeeping status updated.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ---------- Admin ----------
document.getElementById('hotelForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amenities = document.getElementById('h-amenities').value
    .split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const hotel = await api.createHotel({
      name: document.getElementById('h-name').value,
      city: document.getElementById('h-city').value,
      address: document.getElementById('h-address').value,
      amenities,
    });
    showToast(`Hotel created. ID: ${hotel._id}`, 'success');
    e.target.reset();
    loadHotelsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function loadHotelsList() {
  const listEl = document.getElementById('hotelsList');
  try {
    const { items } = await api.listHotels();
    listEl.innerHTML = items.map((h) => `<div class="chip"><span>${h.name} · ${h.city}</span><code>${h._id}</code></div>`).join('');
  } catch (err) {
    listEl.innerHTML = '';
  }
}

document.getElementById('roomTypeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const rt = await api.createRoomType({
      hotelId: document.getElementById('rt-hotelId').value,
      name: document.getElementById('rt-name').value,
      basePrice: Number(document.getElementById('rt-basePrice').value),
      totalRooms: Number(document.getElementById('rt-totalRooms').value),
      capacity: Number(document.getElementById('rt-capacity').value),
    });
    showToast(`Room type created. ID: ${rt._id}`, 'success');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('pricingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ruleType = document.getElementById('p-ruleType').value;
  try {
    await api.createPricingRule({
      roomTypeId: document.getElementById('p-roomTypeId').value,
      season: document.getElementById('p-season').value,
      ruleType,
      startDate: document.getElementById('p-startDate').value || undefined,
      endDate: document.getElementById('p-endDate').value || undefined,
      multiplier: Number(document.getElementById('p-multiplier').value),
    });
    showToast('Pricing rule created.', 'success');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('reportBtn').addEventListener('click', async () => {
  const hotelId = document.getElementById('rep-hotelId').value.trim();
  const resultsEl = document.getElementById('reportResults');
  resultsEl.innerHTML = 'Loading…';
  try {
    const report = await api.occupancyReport(hotelId);
    resultsEl.innerHTML = report.map((r) => `
      <div class="report-card">
        <strong>${r.hotel.name} · ${r.hotel.city}</strong>
        <div class="metric"><span>Occupancy rate</span><span>${r.occupancyRate}%</span></div>
        <div class="metric"><span>Total revenue</span><span>₹${r.totalRevenue.toLocaleString()}</span></div>
        <div class="metric"><span>Bookings in window</span><span>${r.totalBookings}</span></div>
        <div class="metric"><span>Total rooms</span><span>${r.totalRooms}</span></div>
      </div>
    `).join('') || '<p>No hotels found.</p>';
  } catch (err) {
    resultsEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
});

// ---------- Init ----------
refreshAuthUI();
loadHotelsList();

// Sensible default dates: tomorrow -> day after
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2);
document.getElementById('s-checkin').value = tomorrow.toISOString().slice(0, 10);
document.getElementById('s-checkout').value = dayAfter.toISOString().slice(0, 10);
