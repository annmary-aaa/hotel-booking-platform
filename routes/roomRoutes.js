const express = require('express');
const router = express.Router();
const {
  createRoom,
  listRooms,
  updateHousekeepingStatus,
} = require('../controllers/roomController');
const validate = require('../middleware/validate');
const {
  createRoom: createSchema,
  updateHousekeeping: housekeepingSchema,
} = require('../validators/roomValidators');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin'), validate(createSchema), createRoom);
router.get('/', protect, authorize('admin', 'staff'), listRooms);
router.put(
  '/:id/housekeeping',
  protect,
  authorize('staff', 'admin'),
  validate(housekeepingSchema),
  updateHousekeepingStatus
);

module.exports = router;
