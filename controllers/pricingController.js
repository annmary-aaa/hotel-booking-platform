const PricingRule = require('../models/PricingRule');
const RoomType = require('../models/RoomType');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/pricing-rules  (admin only)
const createPricingRule = asyncHandler(async (req, res) => {
  const roomType = await RoomType.findById(req.body.roomTypeId);
  if (!roomType) throw new ApiError(404, 'Room type not found.', 'NOT_FOUND');

  const rule = await PricingRule.create(req.body);
  res.status(201).json({ success: true, message: 'Record created successfully', data: rule });
});

// GET /api/pricing-rules?roomTypeId=...
const listPricingRules = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.roomTypeId) filter.roomTypeId = req.query.roomTypeId;
  const rules = await PricingRule.find(filter).sort({ startDate: 1 });
  res.status(200).json({ success: true, message: 'OK', data: rules });
});

// PUT /api/pricing-rules/:id  (admin only)
const updatePricingRule = asyncHandler(async (req, res) => {
  const rule = await PricingRule.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!rule) throw new ApiError(404, 'Pricing rule not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'Status updated successfully', data: rule });
});

// DELETE /api/pricing-rules/:id  (admin only)
const deletePricingRule = asyncHandler(async (req, res) => {
  const rule = await PricingRule.findByIdAndDelete(req.params.id);
  if (!rule) throw new ApiError(404, 'Pricing rule not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'Pricing rule deleted successfully', data: {} });
});

module.exports = { createPricingRule, listPricingRules, updatePricingRule, deletePricingRule };
