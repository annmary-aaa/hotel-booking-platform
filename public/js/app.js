// ==========================================================================
// GRAND HORIZON — FRONTEND CONTROLLER & INTERACTIVITY
// ==========================================================================

// ---------- Toast Notifications ----------
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.hidden = false;
  
  if (toast.timer) clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 3400);
}

// ---------- View Navigation ----------
function switchView(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  if (view === 'bookings') loadMyBookings();
  if (view === 'staff') loadStaffBookings();
  if (view === 'admin') loadHotelsList();
}

document.getElementById('navTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  switchView(btn.dataset.view);
});

// ---------- Authentication UI & Session ----------
function refreshAuthUI() {
  const user = getUser();
  const greeting = document.getElementById('userGreeting');
  const loginBtn = document.getElementById('loginOpenBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const staffTab = document.getElementById('staffTabBtn');
  const adminTab = document.getElementById('adminTabBtn');

  if (user) {
    greeting.hidden = false;
    greeting.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> <span>${user.name}</span> <code style="text-transform:uppercase">${user.role}</code>`;
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

// Modal open/close controls
document.getElementById('loginOpenBtn').addEventListener('click', () => {
  document.getElementById('authModal').hidden = false;
});
document.getElementById('modalCloseBtn').addEventListener('click', () => {
  document.getElementById('authModal').hidden = true;
});
document.getElementById('invoiceCloseBtn').addEventListener('click', () => {
  document.getElementById('invoiceModal').hidden = true;
});
document.getElementById('checkinCloseBtn').addEventListener('click', () => {
  document.getElementById('checkinModal').hidden = true;
});

// Close modals when clicking backdrop
document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.hidden = true;
  });
});

// Keyboard Escape dismiss
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop').forEach((m) => (m.hidden = true));
  }
});

// Auth Modal Tab Switcher (Login vs Register)
document.querySelectorAll('.modal-tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.modal-form').forEach((f) => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.form}Form`).classList.add('active');
    document.getElementById('authError').textContent = '';
  });
});

// 1-Click Quick Demo Account Fillers
document.querySelectorAll('.demo-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    const role = pill.dataset.demo;
    const emailInput = document.getElementById('l-email');
    const passInput = document.getElementById('l-password');
    
    if (role === 'guest') emailInput.value = 'guest@hotel.com';
    else if (role === 'staff') emailInput.value = 'staff@hotel.com';
    else if (role === 'admin') emailInput.value = 'admin@hotel.com';
    
    passInput.value = 'Password123!';
    showToast(`Loaded ${role} credentials`, 'success');
  });
});

// Login Form Submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-password').value;
  try {
    const data = await api.login({ email, password });
    setSession({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
    document.getElementById('authModal').hidden = true;
    refreshAuthUI();
    showToast(`Welcome back, ${data.name}!`, 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  }
});

// Register Form Submit
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const password = document.getElementById('r-password').value;
  try {
    const data = await api.register({ name, email, password });
    setSession({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token);
    document.getElementById('authModal').hidden = true;
    refreshAuthUI();
    showToast(`Account created! Welcome, ${data.name}`, 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  refreshAuthUI();
  showToast('Logged out successfully');
  switchView('search');
});

// ---------- Search & Live Availability ----------
let lastSearchResults = [];

document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById('searchStatus');
  const resultsEl = document.getElementById('searchResults');
  statusEl.className = 'status-line';
  statusEl.innerHTML = '<span>Checking live inventory &amp; dynamic pricing rules…</span>';
  resultsEl.innerHTML = '';

  const params = {
    checkIn: document.getElementById('s-checkin').value,
    checkOut: document.getElementById('s-checkout').value,
    occupancy: document.getElementById('s-occupancy').value || 1,
  };
  const city = document.getElementById('s-city').value.trim();
  if (city) params.city = city;

  try {
    const results = await api.searchAvailability(params);
    lastSearchResults = results;
    if (results.length) {
      statusEl.innerHTML = `<span>Found <strong>${results.length} available room option(s)</strong> for your chosen stay dates.</span>`;
    } else {
      statusEl.innerHTML = '<span>No rooms available for the selected dates. Try alternate dates or cities.</span>';
    }
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
      <div>
        <h4>${r.hotel.name}</h4>
        <div class="location">
          <span>${r.hotel.city}</span> · 
          <span>${r.roomType.name}</span> · 
          <span>Sleeps up to ${r.roomType.capacity}</span>
        </div>
        <div class="price-box">
          <div class="price">
            ₹${r.priceQuotePerRoom.totalAmount.toLocaleString()}
            <small>Total for ${r.priceQuotePerRoom.nights} night(s), inclusive of all taxes</small>
          </div>
        </div>
        <div class="meta">
          <span>Inventory: <strong>${r.availableCount} remaining</strong></span>
          <span>Base: ₹${r.roomType.basePrice}/night</span>
        </div>
      </div>
      <button class="btn btn-primary" data-idx="${idx}" style="width:100%;margin-top:12px;">
        Reserve This Room
      </button>
    </div>
  `).join('');

  resultsEl.querySelectorAll('button[data-idx]').forEach((btn) => {
    btn.addEventListener('click', () => bookRoom(results[btn.dataset.idx], params));
  });
}

async function bookRoom(result, params) {
  const user = getUser();
  if (!user) {
    showToast('Please sign in as a guest to make a reservation.', 'error');
    document.getElementById('authModal').hidden = false;
    return;
  }
  if (user.role !== 'guest') {
    showToast('Only guest accounts can make reservations.', 'error');
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
    showToast('Reservation confirmed! Redirecting to your bookings…', 'success');
    switchView('bookings');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- My Bookings View ----------
async function loadMyBookings() {
  const user = getUser();
  const statusEl = document.getElementById('bookingsStatus');
  const upcomingEl = document.getElementById('upcomingBookings');
  const pastEl = document.getElementById('pastBookings');
  upcomingEl.innerHTML = '';
  pastEl.innerHTML = '';

  if (!user) {
    statusEl.innerHTML = '<p>Please log in to view your reservation history.</p>';
    return;
  }
  statusEl.textContent = 'Loading your reservations…';

  try {
    const { upcoming, past } = await api.myBookings(user._id);
    statusEl.textContent = '';
    upcomingEl.innerHTML = upcoming.length 
      ? upcoming.map(bookingCard).join('') 
      : '<p class="hint">No upcoming stays found. Use "Find a room" to book a getaway.</p>';
    pastEl.innerHTML = past.length 
      ? past.map(bookingCard).join('') 
      : '<p class="hint">No past stays or cancellations.</p>';
    attachBookingActions();
  } catch (err) {
    statusEl.className = 'status-line error';
    statusEl.textContent = err.message;
  }
}

function bookingCard(b) {
  const checkIn = new Date(b.checkIn).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const checkOut = new Date(b.checkOut).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const canCancel = ['reserved', 'confirmed'].includes(b.status);
  
  return `
    <div class="booking-card status-${b.status}" data-id="${b._id}">
      <div class="row">
        <strong>${b.hotelId?.name || 'Grand Horizon Hotel'}</strong>
        <span class="badge">${b.status.replace('_', ' ')}</span>
      </div>
      <div class="dates">${b.roomTypeId?.name || 'Suite'} · ${checkIn} → ${checkOut}</div>
      <div class="price-row">Total: ₹${b.totalAmount.toLocaleString()}</div>
      <div class="actions">
        <button class="btn-small gold" data-action="invoice" data-id="${b._id}">View Bill / Invoice</button>
        ${canCancel ? `<button class="btn-small danger" data-action="cancel" data-id="${b._id}">Cancel Stay</button>` : ''}
      </div>
    </div>
  `;
}

function attachBookingActions() {
  // Cancel stay
  document.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you wish to cancel this reservation? Refunds are calculated per cancellation policy.')) return;
      try {
        await api.cancelBooking(btn.dataset.id, 'Cancelled by guest via web portal');
        showToast('Reservation cancelled successfully.', 'success');
        loadMyBookings();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // View Invoice
  document.querySelectorAll('[data-action="invoice"]').forEach((btn) => {
    btn.addEventListener('click', () => openInvoiceModal(btn.dataset.id));
  });
}

// Luxury Invoice Modal Handler
async function openInvoiceModal(bookingId) {
  const modal = document.getElementById('invoiceModal');
  const content = document.getElementById('invoiceContent');
  modal.hidden = false;
  content.innerHTML = '<p class="hint">Loading folio details…</p>';

  try {
    const inv = await api.getInvoice(bookingId);
    const checkIn = new Date(inv.checkIn).toLocaleDateString('en-IN', { dateStyle: 'medium' });
    const checkOut = new Date(inv.checkOut).toLocaleDateString('en-IN', { dateStyle: 'medium' });

    let refundBlock = '';
    if (inv.cancellation) {
      refundBlock = `
        <div class="invoice-row" style="color: var(--danger-text)">
          <span>Cancellation Refund (${inv.cancellation.refundPercentage}%)</span>
          <span>- ₹${inv.cancellation.refundAmount.toLocaleString()}</span>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="invoice-sheet">
        <div class="invoice-header">
          <div>
            <h4 style="color:var(--text-pure)">${inv.hotel?.name || 'Grand Horizon Sanctuary'}</h4>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin:0">${inv.hotel?.city || ''}</p>
          </div>
          <div style="text-align:right">
            <span class="badge badge-${inv.status}">${inv.status.replace('_', ' ')}</span>
            <div class="invoice-id" style="margin-top:6px">Folio #${inv.bookingId.slice(-8).toUpperCase()}</div>
          </div>
        </div>

        <div class="invoice-row">
          <span>Room Type</span>
          <span style="color:var(--text-pure);font-weight:600">${inv.roomType?.name || 'Reserved Room'}</span>
        </div>
        <div class="invoice-row">
          <span>Duration</span>
          <span>${checkIn} → ${checkOut} (${inv.nights} night${inv.nights > 1 ? 's' : ''})</span>
        </div>
        <div class="invoice-row">
          <span>Occupants</span>
          <span>${inv.numGuests} Guest(s) · ${inv.numRooms} Room</span>
        </div>
        <div class="invoice-row" style="margin-top:10px;border-top:1px solid #E2E8F0;padding-top:10px;">
          <span>Room Base Tariff</span>
          <span>₹${inv.baseAmount.toLocaleString()}</span>
        </div>
        <div class="invoice-row">
          <span>Applicable GST &amp; Taxes</span>
          <span>₹${inv.taxAmount.toLocaleString()}</span>
        </div>
        
        ${refundBlock}

        <div class="invoice-row total">
          <span>Total Net Amount</span>
          <span>₹${inv.totalAmount.toLocaleString()}</span>
        </div>

        <div class="invoice-row" style="font-weight:600;font-size:1rem;margin-top:6px">
          <span>Net Amount Due</span>
          <span style="color:${inv.amountDue > 0 ? 'var(--text-pure)' : 'var(--success)'}">₹${inv.amountDue.toLocaleString()}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:16px;gap:8px;">
        <button class="btn btn-ghost" onclick="window.print()">Print Receipt</button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
}

// ---------- Staff & Front Desk Operations ----------
async function loadStaffBookings() {
  const listEl = document.getElementById('staffBookingsList');
  const status = document.getElementById('staffStatusFilter').value;
  listEl.innerHTML = '<p class="hint">Loading live queue…</p>';

  try {
    const { items } = await api.listAllBookings(status);
    listEl.innerHTML = items.length 
      ? items.map(staffBookingCard).join('') 
      : '<p class="hint">No reservations found for the selected status.</p>';
    attachStaffActions();
  } catch (err) {
    listEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
}

function staffBookingCard(b) {
  const checkIn = new Date(b.checkIn).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  const checkOut = new Date(b.checkOut).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  
  let actionButtons = '';
  if (b.status === 'reserved') {
    actionButtons += `<button class="btn-small success" data-action="confirm" data-id="${b._id}">Confirm</button>`;
  }
  if (['reserved', 'confirmed'].includes(b.status)) {
    actionButtons += `<button class="btn-small gold" data-action="checkin" data-id="${b._id}" data-roomtype="${b.roomTypeId?._id || ''}" data-guest="${b.guestId?.name || ''}">Check in…</button>`;
  }
  if (b.status === 'checked_in') {
    actionButtons += `<button class="btn-small" data-action="checkout" data-id="${b._id}">Check out</button>`;
  }
  actionButtons += `<button class="btn-small" data-action="staff-invoice" data-id="${b._id}">Folio</button>`;

  return `
    <div class="booking-card status-${b.status}">
      <div class="row">
        <strong>${b.guestId?.name || 'Guest'}</strong>
        <span class="badge">${b.status.replace('_', ' ')}</span>
      </div>
      <div class="dates">${b.hotelId?.name || 'Hotel'} · ${b.roomTypeId?.name || 'Room'}</div>
      <div class="dates">${checkIn} → ${checkOut} · ₹${b.totalAmount.toLocaleString()}</div>
      <div class="actions">${actionButtons}</div>
    </div>
  `;
}

function attachStaffActions() {
  // Confirm Booking
  document.querySelectorAll('[data-action="confirm"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api.confirmBooking(btn.dataset.id);
        showToast('Reservation confirmed.', 'success');
        loadStaffBookings();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Check In - Open Clean Room Picker Modal
  document.querySelectorAll('[data-action="checkin"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openCheckinModal(btn.dataset.id, btn.dataset.roomtype, btn.dataset.guest);
    });
  });

  // Check Out
  document.querySelectorAll('[data-action="checkout"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api.checkoutBooking(btn.dataset.id);
        showToast('Guest checked out. Room status updated to dirty for cleaning.', 'success');
        loadStaffBookings();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // View Folio
  document.querySelectorAll('[data-action="staff-invoice"]').forEach((btn) => {
    btn.addEventListener('click', () => openInvoiceModal(btn.dataset.id));
  });
}

// Clean Room Picker Modal Logic
async function openCheckinModal(bookingId, roomTypeId, guestName) {
  const modal = document.getElementById('checkinModal');
  const listEl = document.getElementById('cleanRoomsList');
  const statusEl = document.getElementById('checkinModalStatus');
  const subtitle = document.getElementById('checkinModalSubtitle');

  modal.hidden = false;
  subtitle.textContent = `Assigning room for guest: ${guestName || 'Guest'}`;
  listEl.innerHTML = '<p class="hint">Loading clean & inspected rooms…</p>';
  statusEl.textContent = '';

  try {
    const rooms = await api.listRooms(roomTypeId);
    // Filter clean or inspected rooms
    const cleanRooms = rooms.filter((r) => ['clean', 'inspected'].includes(r.housekeepingStatus));

    if (cleanRooms.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 14px; background: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: var(--radius-sm)">
          <p style="color:var(--danger-text);font-weight:600;margin:0;font-size:0.9rem">No clean or inspected rooms currently found for this room type. You may update room status in Housekeeping, or assign a Room ID manually:</p>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <input type="text" id="manualRoomId" placeholder="Enter Room ID manually" style="max-width:260px" />
            <button class="btn btn-primary" id="manualCheckinBtn">Assign Room</button>
          </div>
        </div>
      `;
      document.getElementById('manualCheckinBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('manualRoomId').value.trim();
        if (!id) return;
        submitCheckin(bookingId, id);
      });
      return;
    }

    listEl.innerHTML = cleanRooms.map((r) => `
      <div class="room-card-btn" data-room-id="${r._id}">
        <span class="room-num">Room ${r.roomNumber}</span>
        <span class="room-status">● ${r.housekeepingStatus}</span>
        <code style="font-size:0.7rem">${r._id.slice(-6)}</code>
      </div>
    `).join('');

    listEl.querySelectorAll('.room-card-btn').forEach((card) => {
      card.addEventListener('click', () => submitCheckin(bookingId, card.dataset.roomId));
    });

  } catch (err) {
    listEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
}

async function submitCheckin(bookingId, roomId) {
  try {
    await api.checkinBooking(bookingId, roomId);
    document.getElementById('checkinModal').hidden = true;
    showToast('Guest checked in successfully!', 'success');
    loadStaffBookings();
  } catch (err) {
    document.getElementById('checkinModalStatus').className = 'status-line error';
    document.getElementById('checkinModalStatus').textContent = err.message;
  }
}

document.getElementById('staffRefreshBtn').addEventListener('click', loadStaffBookings);
document.getElementById('staffStatusFilter').addEventListener('change', loadStaffBookings);

// Housekeeping Operations
document.getElementById('hkRefreshBtn').addEventListener('click', async () => {
  const roomTypeId = document.getElementById('hkRoomTypeId').value.trim();
  const listEl = document.getElementById('roomsList');
  listEl.innerHTML = '<p class="hint">Loading rooms…</p>';
  try {
    const rooms = await api.listRooms(roomTypeId);
    listEl.innerHTML = rooms.length 
      ? rooms.map(roomRow).join('') 
      : '<p class="hint">No rooms found matching criteria.</p>';
    attachRoomActions();
  } catch (err) {
    listEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
});

function roomRow(r) {
  return `
    <div class="room-row">
      <span>
        <strong>Room ${r.roomNumber}</strong> 
        <code style="margin-left:8px">${r._id}</code>
      </span>
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
        showToast(`Room status changed to ${sel.value.replace('_', ' ')}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ---------- Property Admin Operations ----------
document.getElementById('hotelForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amenities = document.getElementById('h-amenities').value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const hotel = await api.createHotel({
      name: document.getElementById('h-name').value.trim(),
      city: document.getElementById('h-city').value.trim(),
      address: document.getElementById('h-address').value.trim(),
      amenities,
    });
    showToast(`Hotel '${hotel.name}' created!`, 'success');
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
    listEl.innerHTML = items.map((h) => `
      <div class="chip">
        <span><strong>${h.name}</strong> · ${h.city}</span>
        <code title="Click to copy ID" onclick="navigator.clipboard.writeText('${h._id}'); showToast('Copied Hotel ID to clipboard!','success')">${h._id}</code>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<p class="hint">No hotels found.</p>';
  }
}

document.getElementById('roomTypeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const rt = await api.createRoomType({
      hotelId: document.getElementById('rt-hotelId').value.trim(),
      name: document.getElementById('rt-name').value.trim(),
      basePrice: Number(document.getElementById('rt-basePrice').value),
      totalRooms: Number(document.getElementById('rt-totalRooms').value),
      capacity: Number(document.getElementById('rt-capacity').value),
    });
    showToast(`Room Type '${rt.name}' created! ID: ${rt._id}`, 'success');
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
      roomTypeId: document.getElementById('p-roomTypeId').value.trim(),
      season: document.getElementById('p-season').value.trim(),
      ruleType,
      startDate: document.getElementById('p-startDate').value || undefined,
      endDate: document.getElementById('p-endDate').value || undefined,
      multiplier: Number(document.getElementById('p-multiplier').value),
    });
    showToast('Dynamic pricing rule configured successfully.', 'success');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('reportBtn').addEventListener('click', async () => {
  const hotelId = document.getElementById('rep-hotelId').value.trim();
  const resultsEl = document.getElementById('reportResults');
  resultsEl.innerHTML = '<p class="hint">Generating analytics report…</p>';

  try {
    const report = await api.occupancyReport(hotelId);
    if (!report.length) {
      resultsEl.innerHTML = '<p class="hint">No report data found.</p>';
      return;
    }

    resultsEl.innerHTML = report.map((r) => `
      <div class="report-card">
        <strong>${r.hotel.name} · ${r.hotel.city}</strong>
        
        <div class="progress-container">
          <div class="progress-bar" style="width: ${Math.min(r.occupancyRate, 100)}%"></div>
        </div>

        <div class="metric">
          <span>Occupancy Rate</span>
          <span style="color:var(--gold-light)">${r.occupancyRate}%</span>
        </div>
        <div class="metric">
          <span>Total Gross Revenue</span>
          <span>₹${r.totalRevenue.toLocaleString()}</span>
        </div>
        <div class="metric">
          <span>Active Bookings</span>
          <span>${r.totalBookings}</span>
        </div>
        <div class="metric">
          <span>Total Rooms Inventory</span>
          <span>${r.totalRooms}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    resultsEl.innerHTML = `<p class="status-line error">${err.message}</p>`;
  }
});

// ---------- Initialization ----------
refreshAuthUI();
loadHotelsList();

// Preset dates: tomorrow -> day after tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);

document.getElementById('s-checkin').value = tomorrow.toISOString().slice(0, 10);
document.getElementById('s-checkout').value = dayAfter.toISOString().slice(0, 10);
