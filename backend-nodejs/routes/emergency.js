import express from 'express';
const router = express.Router();

// Trigger emergency alert
router.post('/trigger', async (req, res) => {
  try {
    const { bookingId, location, type } = req.body;
    const userId = req.user.id;

    // Create emergency alert
    const alertId = await req.db.run(`
      INSERT INTO emergency_alerts (
        user_id, booking_id, alert_type, latitude, longitude, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?)
    `, [userId, bookingId, type, location?.lat, location?.lng, new Date().toISOString()]);

    // Get user and booking details
    const user = await req.db.get(`
      SELECT * FROM users WHERE id = ?
    `, [userId]);

    const booking = bookingId ? await req.db.get(`
      SELECT b.*, c.make, c.model 
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = ?
    `, [bookingId]) : null;

    // Get emergency contacts
    const emergencyContacts = await req.db.all(`
      SELECT * FROM emergency_contacts WHERE user_id = ?
    `, [userId]);

    // Notify emergency services (simulate)
    const emergencyData = {
      alertId: alertId,
      user: {
        name: `${user.first_name} ${user.last_name}`,
        phone: user.phone,
        email: user.email
      },
      location,
      booking: booking ? {
        car: `${booking.make} ${booking.model}`,
        id: booking.id
      } : null,
      timestamp: new Date().toISOString()
    };

    // TODO: Integrate with actual emergency services API
    console.log('🚨 EMERGENCY ALERT:', emergencyData);

    // Send real-time notifications
    req.io.emit('emergency-alert', {
      type: 'emergency',
      data: emergencyData
    });

    // Notify emergency contacts
    for (const contact of emergencyContacts) {
      // TODO: Send SMS/call to emergency contacts
      console.log(`Emergency notification sent to ${contact.name}: ${contact.phone}`);
    }

    // Send to admin dashboard
    req.io.emit('admin-alert', {
      type: 'emergency',
      priority: 'critical',
      user: emergencyData.user,
      location: emergencyData.location,
      alertId
    });

    res.json({
      success: true,
      alertId,
      message: 'Emergency alert triggered successfully',
      emergencyNumber: '+254911' // Kenya emergency number
    });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger emergency alert'
    });
  }
});

// Get emergency contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await req.db.all(`
      SELECT * FROM emergency_contacts 
      WHERE user_id = ? 
      ORDER BY priority ASC
    `, [req.user.id]);

    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency contacts'
    });
  }
});

// Add emergency contact
router.post('/contacts', async (req, res) => {
  try {
    const { name, phone, email, relationship, priority = 1 } = req.body;
    const userId = req.user.id;

    await req.db.run(`
      INSERT INTO emergency_contacts (
        user_id, name, phone, email, relationship, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, name, phone, email, relationship, priority, new Date().toISOString()]);

    res.json({
      success: true,
      message: 'Emergency contact added'
    });
  } catch (error) {
    console.error('Add emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add emergency contact'
    });
  }
});

// Update emergency contact
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, relationship, priority } = req.body;
    const userId = req.user.id;

    await req.db.run(`
      UPDATE emergency_contacts SET
        name = ?, phone = ?, email = ?, relationship = ?, priority = ?
      WHERE id = ? AND user_id = ?
    `, [name, phone, email, relationship, priority, id, userId]);

    res.json({
      success: true,
      message: 'Emergency contact updated'
    });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact'
    });
  }
});

// Delete emergency contact
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await req.db.run(`
      DELETE FROM emergency_contacts 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Emergency contact deleted'
    });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency contact'
    });
  }
});

// Get emergency alerts history
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await req.db.all(`
      SELECT ea.*, u.first_name, u.last_name, u.phone
      FROM emergency_alerts ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.user_id = ?
      ORDER BY ea.created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    console.error('Get emergency alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency alerts'
    });
  }
});

// Update alert status (for emergency responders)
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, responderNotes } = req.body;

    await req.db.run(`
      UPDATE emergency_alerts SET
        status = ?, responder_notes = ?, resolved_at = ?
      WHERE id = ?
    `, [status, responderNotes, status === 'resolved' ? new Date().toISOString() : null, id]);

    // Notify user about status update
    const alert = await req.db.get(`
      SELECT ea.*, u.first_name, u.last_name
      FROM emergency_alerts ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.id = ?
    `, [id]);

    if (alert) {
      req.io.to(`user_${alert.user_id}`).emit('emergency-status-update', {
        alertId: id,
        status,
        responderNotes,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Alert status updated'
    });
  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert status'
    });
  }
});

export default router;