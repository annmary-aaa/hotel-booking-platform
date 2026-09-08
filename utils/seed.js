// Populates the database with a small, realistic demo dataset:
// one admin, one staff member, one guest, one hotel, two room types,
// physical rooms, and a couple of pricing rules.
// Run with: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');
const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const PricingRule = require('../models/PricingRule');
const Booking = require('../models/Booking');

async function seed() {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Hotel.deleteMany({}),
    RoomType.deleteMany({}),
    Room.deleteMany({}),
    PricingRule.deleteMany({}),
    Booking.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [admin, staff, guest] = await User.create([
    { name: 'Alice Admin', email: 'admin@hotel.com', passwordHash, role: 'admin' },
    { name: 'Sam Staff', email: 'staff@hotel.com', passwordHash, role: 'staff' },
    { name: 'Gary Guest', email: 'guest@hotel.com', passwordHash, role: 'guest' },
  ]);

  const hotel = await Hotel.create({
    name: 'Grand Horizon Hotel',
    city: 'Bengaluru',
    address: 'MG Road, Bengaluru',
    amenities: ['Free WiFi', 'Pool', 'Gym', 'Breakfast Included'],
    rating: 4.5,
    createdBy: admin._id,
  });

  const [deluxe, suite] = await RoomType.create([
    {
      hotelId: hotel._id,
      name: 'Deluxe',
      description: 'Comfortable room with city view',
      basePrice: 4000,
      totalRooms: 5,
      capacity: 2,
      amenities: ['AC', 'TV', 'Mini Fridge'],
    },
    {
      hotelId: hotel._id,
      name: 'Suite',
      description: 'Spacious suite with lounge area',
      basePrice: 8000,
      totalRooms: 3,
      capacity: 4,
      amenities: ['AC', 'TV', 'Mini Fridge', 'Lounge', 'Bathtub'],
    },
  ]);

  const roomDocs = [];
  for (let i = 1; i <= deluxe.totalRooms; i += 1) {
    roomDocs.push({ roomTypeId: deluxe._id, roomNumber: `D${String(i).padStart(3, '0')}`, floor: 1 });
  }
  for (let i = 1; i <= suite.totalRooms; i += 1) {
    roomDocs.push({ roomTypeId: suite._id, roomNumber: `S${String(i).padStart(3, '0')}`, floor: 2 });
  }
  await Room.insertMany(roomDocs);

  await PricingRule.create([
    {
      roomTypeId: deluxe._id,
      season: 'Weekend Rate',
      ruleType: 'weekend',
      multiplier: 1.2,
    },
    {
      roomTypeId: suite._id,
      season: 'Festive Season 2026',
      ruleType: 'seasonal',
      startDate: '2026-12-15',
      endDate: '2027-01-05',
      multiplier: 1.5,
    },
  ]);

  console.log('Seed complete!');
  console.log('Login credentials (password for all: Password123!):');
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Staff: ${staff.email}`);
  console.log(`  Guest: ${guest.email}`);

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
