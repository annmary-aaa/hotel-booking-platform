const express = require('express');
const router = express.Router();
const {
  createBooking,
  listAllBookings,
  getBooking,
  confirmBooking,
  checkinBooking,
  checkoutBooking,
  cancelBooking,
  getInvoice,
} = require('../controllers/bookingController');
const validate = require('../middleware/validate');
const {
  createBooking: createSchema,
  cancelBooking: cancelSchema,
  checkinBooking: checkinSchema,
} = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('guest'), validate(createSchema), createBooking);
router.get('/', protect, authorize('admin', 'staff'), listAllBookings);
router.get('/:id', protect, getBooking);
router.get('/:id/invoice', protect, getInvoice);
router.put('/:id/confirm', protect, authorize('staff', 'admin'), confirmBooking);
router.put(
  '/:id/checkin',
  protect,
  authorize('staff', 'admin'),
  validate(checkinSchema),
  checkinBooking
);
router.put('/:id/checkout', protect, authorize('staff', 'admin'), checkoutBooking);
router.put('/:id/cancel', protect, validate(cancelSchema), cancelBooking);

module.exports = router;
