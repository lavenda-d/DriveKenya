import express from 'express';
const router = express.Router();

// Get tracking data for booking
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Get booking details
    const booking = await req.db.get(`
      SELECT b.*, c.make, c.model, c.location as pickup_location
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = ? AND (b.user_id = ? OR c.owner_id = ?)
    `, [bookingId, req.user.id, req.user.id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get latest location
    const currentLocation = await req.db.get(`
      SELECT * FROM location_history 
      WHERE booking_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [bookingId]);

    // Get geofences
    const geofences = await req.db.all(`
      SELECT * FROM geofences 
      WHERE booking_id = ? OR booking_id IS NULL
    `, [bookingId]);

    // Get destination (return location)
    const destination = {
      lat: parseFloat(booking.return_latitude) || -1.286389,
      lng: parseFloat(booking.return_longitude) || 36.817223
    };

    res.json({
      success: true,
      booking,
      currentLocation: currentLocation ? {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        speed: currentLocation.speed,
        heading: currentLocation.heading,
        timestamp: currentLocation.timestamp
      } : null,
      destination,
      geofences: geofences.map(g => ({
        id: g.id,
        name: g.name,
        center: { lat: g.latitude, lng: g.longitude },
        radius: g.radius_km,
        type: g.type
      })),
      trackingData: {
        status: booking.status,
        distance: 0,
        speed: 0,
        eta: null
      }
    });
  } catch (error) {
    console.error('Tracking data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking data'
    });
  }
});

// Update location
router.post('/:bookingId/location', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    // Verify booking ownership
    const booking = await req.db.get(`
      SELECT * FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = ? AND (b.user_id = ? OR c.owner_id = ?)
    `, [bookingId, req.user.id, req.user.id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Store location in history
    await req.db.run(`
      INSERT INTO location_history (
        booking_id, latitude, longitude, speed, heading, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [bookingId, latitude, longitude, speed || 0, heading || 0, new Date().toISOString()]);

    // Broadcast location update via WebSocket
    req.io.to(`booking_${bookingId}`).emit('location-update', {
      bookingId,
      location: { lat: latitude, lng: longitude, speed, heading },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Share location with emergency contacts
router.post('/share-location', async (req, res) => {
  try {
    const { bookingId, location } = req.body;
    const userId = req.user.id;

    // Get emergency contacts
    const contacts = await req.db.all(`
      SELECT * FROM emergency_contacts WHERE user_id = ?
    `, [userId]);

    // Create location sharing record
    await req.db.run(`
      INSERT INTO location_shares (
        user_id, booking_id, latitude, longitude, shared_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [userId, bookingId, location.lat, location.lng, new Date().toISOString()]);

    // Send notifications to emergency contacts
    for (const contact of contacts) {
      // TODO: Send SMS/email to emergency contact
      console.log(`Location shared with ${contact.name}: ${location.lat}, ${location.lng}`);
    }

    res.json({
      success: true,
      message: 'Location shared with emergency contacts'
    });
  } catch (error) {
    console.error('Location sharing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share location'
    });
  }
});

// Get location history
router.get('/:bookingId/history', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { limit = 100 } = req.query;

    const history = await req.db.all(`
      SELECT * FROM location_history 
      WHERE booking_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [bookingId, limit]);

    res.json({
      success: true,
      history: history.map(h => ({
        lat: h.latitude,
        lng: h.longitude,
        speed: h.speed,
        heading: h.heading,
        timestamp: h.timestamp
      }))
    });
  } catch (error) {
    console.error('Location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location history'
    });
  }
});

export default router;