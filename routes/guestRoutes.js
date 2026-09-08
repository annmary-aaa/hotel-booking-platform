const express = require('express');
const router = express.Router();
const { getGuestBookingHistory } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.get('/:id/bookings', protect, getGuestBookingHistory);

module.exports = router;
