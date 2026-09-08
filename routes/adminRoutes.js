const express = require('express');
const router = express.Router();
const { getOccupancyReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/reports/occupancy', protect, authorize('admin', 'staff'), getOccupancyReport);

module.exports = router;
