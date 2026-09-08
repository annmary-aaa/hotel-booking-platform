const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const PricingRule = require('../models/PricingRule');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getAvailableCount } = require('../utils/availability');
const { calculateStayPrice } = require('../utils/pricingEngine');

// GET /api/hotels/search?hotelId=&city=&checkIn=&checkOut=&occupancy=
const searchAvailability = asyncHandler(async (req, res) => {
  const { hotelId, city, checkIn, checkOut, occupancy } = req.query;

  const hotelFilter = { isActive: true };
  if (hotelId) hotelFilter._id = hotelId;
  if (city) hotelFilter.city = new RegExp(city, 'i');

  const hotels = await Hotel.find(hotelFilter);
  if (hotels.length === 0) {
    return res.status(200).json({ success: true, message: 'OK', data: [] });
  }

  const hotelIds = hotels.map((h) => h._id);
  const roomTypeFilter = { hotelId: { $in: hotelIds } };
  if (occupancy) roomTypeFilter.capacity = { $gte: Number(occupancy) };

  const roomTypes = await RoomType.find(roomTypeFilter);

  const results = [];
  for (const roomType of roomTypes) {
    const availableCount = await getAvailableCount(roomType, checkIn, checkOut);
    if (availableCount <= 0) continue;

    const pricingRules = await PricingRule.find({ roomTypeId: roomType._id, isActive: true });
    const priceQuote = calculateStayPrice({
      basePrice: roomType.basePrice,
      checkIn,
      checkOut,
      numRooms: 1,
      pricingRules,
    });

    const hotel = hotels.find((h) => String(h._id) === String(roomType.hotelId));

    results.push({
      hotel: { _id: hotel._id, name: hotel.name, city: hotel.city, rating: hotel.rating },
      roomType: {
        _id: roomType._id,
        name: roomType.name,
        capacity: roomType.capacity,
        basePrice: roomType.basePrice,
      },
      availableCount,
      priceQuotePerRoom: priceQuote,
    });
  }

  res.status(200).json({ success: true, message: 'OK', data: results });
});

module.exports = { searchAvailability };
