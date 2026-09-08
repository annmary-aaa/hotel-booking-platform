const mongoose = require('mongoose');

// Referenced to RoomType: pricing rules are managed and queried independently
// (admins add/edit seasonal rules without touching the room type document).
const pricingRuleSchema = new mongoose.Schema(
  {
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    season: { type: String, required: true, trim: true }, // e.g. "Summer 2026", "Weekend"
    ruleType: { type: String, enum: ['seasonal', 'weekend'], default: 'seasonal' },
    startDate: { type: Date }, // required for seasonal rules
    endDate: { type: Date }, // required for seasonal rules
    multiplier: { type: Number, required: true, min: 0.1 }, // e.g. 1.25 = +25%
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pricingRuleSchema.index({ roomTypeId: 1 });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
