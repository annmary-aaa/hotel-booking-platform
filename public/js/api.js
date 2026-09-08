const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('hb_token');
}
function getUser() {
  const raw = localStorage.getItem('hb_user');
  return raw ? JSON.parse(raw) : null;
}
function setSession(user, token) {
  localStorage.setItem('hb_token', token);
  localStorage.setItem('hb_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('hb_token');
  localStorage.removeItem('hb_user');
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { success: false, message: 'Unexpected server response' };
  }

  if (!res.ok || data.success === false) {
    const err = new Error(data.message || `Request failed with status ${res.status}`);
    err.errorCode = data.errorCode;
    err.status = res.status;
    throw err;
  }
  return data.data;
}

const api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),

  searchAvailability: (params) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/hotels/search?${qs}`, { auth: false });
  },
  listHotels: () => apiRequest('/hotels', { auth: false }),
  createHotel: (payload) => apiRequest('/hotels', { method: 'POST', body: payload }),

  createRoomType: (payload) => apiRequest('/room-types', { method: 'POST', body: payload }),

  createPricingRule: (payload) => apiRequest('/pricing-rules', { method: 'POST', body: payload }),

  createBooking: (payload) => apiRequest('/bookings', { method: 'POST', body: payload }),
  myBookings: (userId) => apiRequest(`/guests/${userId}/bookings`),
  getInvoice: (id) => apiRequest(`/bookings/${id}/invoice`),
  cancelBooking: (id, reason) => apiRequest(`/bookings/${id}/cancel`, { method: 'PUT', body: { reason } }),
  confirmBooking: (id) => apiRequest(`/bookings/${id}/confirm`, { method: 'PUT' }),
  checkinBooking: (id, roomId) => apiRequest(`/bookings/${id}/checkin`, { method: 'PUT', body: { roomId } }),
  checkoutBooking: (id) => apiRequest(`/bookings/${id}/checkout`, { method: 'PUT' }),
  listAllBookings: (status) => apiRequest(`/bookings${status ? `?status=${status}` : ''}`),

  listRooms: (roomTypeId) => apiRequest(`/rooms${roomTypeId ? `?roomTypeId=${roomTypeId}` : ''}`),
  updateHousekeeping: (id, housekeepingStatus) =>
    apiRequest(`/rooms/${id}/housekeeping`, { method: 'PUT', body: { housekeepingStatus } }),

  occupancyReport: (hotelId) =>
    apiRequest(`/admin/reports/occupancy${hotelId ? `?hotelId=${hotelId}` : ''}`),
};
