const express = require('express');
const router = express.Router();
const {
  createRoomType,
  listRoomTypes,
  getRoomType,
  updateRoomType,
  deleteRoomType,
} = require('../controllers/roomTypeController');
const validate = require('../middleware/validate');
const {
  createRoomType: createSchema,
  updateRoomType: updateSchema,
} = require('../validators/roomValidators');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin'), validate(createSchema), createRoomType);
router.get('/', listRoomTypes);
router.get('/:id', getRoomType);
router.put('/:id', protect, authorize('admin'), validate(updateSchema), updateRoomType);
router.delete('/:id', protect, authorize('admin'), deleteRoomType);

module.exports = router;
