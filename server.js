require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const roomTypeRoutes = require('./routes/roomTypeRoutes');
const roomRoutes = require('./routes/roomRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const guestRoutes = require('./routes/guestRoutes');
const adminRoutes = require('./routes/adminRoutes');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve the optional demo frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/pricing-rules', pricingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy', data: { uptime: process.uptime() } });
});

// 404 + centralized error handling (must be registered last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
