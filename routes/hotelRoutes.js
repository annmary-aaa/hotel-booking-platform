const express = require('express');
const router = express.Router();
const {
  createHotel,
  listHotels,
  getHotel,
  updateHotel,
  deleteHotel,
} = require('../controllers/hotelController');
const { searchAvailability } = require('../controllers/availabilityController');
const validate = require('../middleware/validate');
const { createHotel: createSchema, updateHotel: updateSchema } = require('../validators/hotelValidators');
const { searchAvailability: searchSchema } = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/auth');

// IMPORTANT: /search must be declared before /:id to avoid being captured by it.
router.get('/search', validate(searchSchema, 'query'), searchAvailability);

router.post('/', protect, authorize('admin'), validate(createSchema), createHotel);
router.get('/', listHotels);
router.get('/:id', getHotel);
router.put('/:id', protect, authorize('admin'), validate(updateSchema), updateHotel);
router.delete('/:id', protect, authorize('admin'), deleteHotel);

module.exports = router;
