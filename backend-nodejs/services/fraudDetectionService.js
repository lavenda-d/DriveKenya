const { Matrix } = await import('ml-matrix');
import crypto from 'crypto';

class FraudDetectionEngine {
  constructor() {
    this.riskThresholds = {
      LOW: 0.3,
      MEDIUM: 0.6,
      HIGH: 0.8,
      CRITICAL: 0.95
    };
    
    this.behaviorWeights = {
      loginFrequency: 0.15,
      deviceFingerprint: 0.20,
      geolocation: 0.25,
      paymentBehavior: 0.20,
      bookingPatterns: 0.20
    };
  }

  // Main fraud detection method
  async analyzeFraudRisk(userId, action, context, db) {
    try {
      const userProfile = await this.getUserProfile(userId, db);
      const riskFactors = await this.calculateRiskFactors(userId, action, context, db);
      const score = this.calculateRiskScore(riskFactors);
      const riskLevel = this.determineRiskLevel(score);

      // Log the analysis
      await this.logFraudAnalysis(userId, action, context, score, riskLevel, db);

      // Trigger alerts if necessary
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.triggerAlert(userId, action, context, score, riskLevel, db);
      }

      return {
        userId,
        action,
        riskScore: score,
        riskLevel,
        factors: riskFactors,
        timestamp: new Date().toISOString(),
        requiresReview: riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
      };
    } catch (error) {
      console.error('Fraud detection error:', error);
      return {
        userId,
        action,
        riskScore: 0.5, // Default medium risk on error
        riskLevel: 'MEDIUM',
        factors: {},
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get user profile and historical behavior
  async getUserProfile(userId, db) {
    const profile = await db.get(`
      SELECT 
        u.*,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT p.id) as total_payments,
        AVG(r.rating) as avg_rating,
        COUNT(DISTINCT fd.id) as fraud_incidents
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      LEFT JOIN payments p ON u.id = p.user_id
      LEFT JOIN reviews r ON u.id = r.user_id
      LEFT JOIN fraud_detections fd ON u.id = fd.user_id AND fd.risk_level IN ('HIGH', 'CRITICAL')
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    return profile;
  }

  // Calculate various risk factors
  async calculateRiskFactors(userId, action, context, db) {
    const factors = {};

    // Device fingerprint analysis
    factors.deviceRisk = await this.analyzeDeviceFingerprint(userId, context, db);

    // Geolocation analysis
    factors.locationRisk = await this.analyzeGeolocation(userId, context, db);

    // Login frequency analysis
    factors.loginRisk = await this.analyzeLoginFrequency(userId, db);

    // Payment behavior analysis
    factors.paymentRisk = await this.analyzePaymentBehavior(userId, context, db);

    // Booking patterns analysis
    factors.bookingRisk = await this.analyzeBookingPatterns(userId, context, db);

    // Time-based analysis
    factors.timeRisk = this.analyzeTimePatterns(context);

    // Velocity analysis
    factors.velocityRisk = await this.analyzeVelocity(userId, action, db);

    return factors;
  }

  // Analyze device fingerprint
  async analyzeDeviceFingerprint(userId, context, db) {
    const userAgent = context.userAgent || '';
    const ip = context.ip || '';
    const fingerprint = this.generateFingerprint(userAgent, ip);

    // Get recent fingerprints for user
    const recentFingerprints = await db.all(`
      SELECT DISTINCT device_fingerprint 
      FROM user_sessions 
      WHERE user_id = ? AND created_at > datetime('now', '-30 days')
    `, [userId]);

    const knownFingerprints = recentFingerprints.map(r => r.device_fingerprint);
    const isNewDevice = !knownFingerprints.includes(fingerprint);

    // Higher risk for completely new devices
    return isNewDevice ? 0.7 : 0.1;
  }

  // Analyze geolocation patterns
  async analyzeGeolocation(userId, context, db) {
    const currentLocation = context.location || { lat: 0, lng: 0 };
    
    // Get recent locations
    const recentLocations = await db.all(`
      SELECT latitude, longitude, created_at
      FROM user_locations 
      WHERE user_id = ? AND created_at > datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    if (recentLocations.length === 0) return 0.3; // Medium risk for no location history

    // Calculate distance from usual locations
    const distances = recentLocations.map(loc => 
      this.calculateDistance(
        currentLocation.lat, currentLocation.lng,
        loc.latitude, loc.longitude
      )
    );

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDistance = Math.max(...distances);

    // Risk increases with distance from usual locations
    if (maxDistance > 500) return 0.8; // Very far from usual locations
    if (avgDistance > 100) return 0.6; // Moderately far
    return 0.2; // Within usual area
  }

  // Analyze login frequency patterns
  async analyzeLoginFrequency(userId, db) {
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const recentLogins = await db.all(`
      SELECT created_at FROM user_sessions 
      WHERE user_id = ? AND created_at > ?
      ORDER BY created_at DESC
    `, [userId, dayAgo.toISOString()]);

    const loginsLastHour = recentLogins.filter(
      login => new Date(login.created_at) > hourAgo
    ).length;

    // High risk for too many logins in short time
    if (loginsLastHour > 10) return 0.9;
    if (loginsLastHour > 5) return 0.7;
    if (loginsLastHour > 3) return 0.5;
    return 0.1;
  }

  // Analyze payment behavior
  async analyzePaymentBehavior(userId, context, db) {
    if (!context.paymentData) return 0.1;

    const { amount, method } = context.paymentData;
    
    // Get payment history
    const payments = await db.all(`
      SELECT amount, payment_method, created_at
      FROM payments 
      WHERE user_id = ? AND created_at > datetime('now', '-90 days')
      ORDER BY created_at DESC
    `, [userId]);

    if (payments.length === 0) return 0.4; // Medium risk for first payment

    // Analyze amount patterns
    const amounts = payments.map(p => p.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountDeviation = Math.abs(amount - avgAmount) / avgAmount;

    let risk = 0.1;

    // High risk for unusually large amounts
    if (amountDeviation > 5) risk += 0.6;
    else if (amountDeviation > 2) risk += 0.3;

    // Additional risk for new payment methods
    const usedMethods = [...new Set(payments.map(p => p.payment_method))];
    if (!usedMethods.includes(method)) risk += 0.2;

    return Math.min(risk, 0.9);
  }

  // Analyze booking patterns
  async analyzeBookingPatterns(userId, context, db) {
    const bookings = await db.all(`
      SELECT *, 
        (julianday(return_date) - julianday(pickup_date)) as duration_days
      FROM bookings 
      WHERE user_id = ? AND created_at > datetime('now', '-90 days')
      ORDER BY created_at DESC
    `, [userId]);

    if (bookings.length === 0) return 0.3; // Medium risk for first booking

    // Analyze patterns
    const durations = bookings.map(b => b.duration_days);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    // Current booking context
    const currentDuration = context.bookingData?.duration || avgDuration;
    const durationDeviation = Math.abs(currentDuration - avgDuration) / avgDuration;

    let risk = 0.1;

    // Risk for unusual booking duration
    if (durationDeviation > 3) risk += 0.4;

    // Risk for too many bookings in short time
    const recentBookings = bookings.filter(
      b => new Date(b.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    if (recentBookings > 5) risk += 0.5;
    else if (recentBookings > 3) risk += 0.3;

    return Math.min(risk, 0.9);
  }

  // Analyze time patterns
  analyzeTimePatterns(context) {
    const now = new Date();
    const hour = now.getHours();
    
    // Higher risk for unusual hours (2 AM - 5 AM)
    if (hour >= 2 && hour <= 5) return 0.4;
    
    // Medium risk for late night (10 PM - 2 AM)
    if (hour >= 22 || hour <= 2) return 0.2;
    
    return 0.1; // Normal hours
  }

  // Analyze action velocity
  async analyzeVelocity(userId, action, db) {
    const recentActions = await db.all(`
      SELECT action, created_at FROM fraud_detections 
      WHERE user_id = ? AND created_at > datetime('now', '-1 hour')
      ORDER BY created_at DESC
    `, [userId]);

    const sameActionCount = recentActions.filter(a => a.action === action).length;
    
    // High risk for repeated actions
    if (sameActionCount > 10) return 0.9;
    if (sameActionCount > 5) return 0.6;
    if (sameActionCount > 3) return 0.4;
    
    return 0.1;
  }

  // Calculate overall risk score
  calculateRiskScore(factors) {
    let score = 0;
    
    score += (factors.deviceRisk || 0) * this.behaviorWeights.deviceFingerprint;
    score += (factors.locationRisk || 0) * this.behaviorWeights.geolocation;
    score += (factors.loginRisk || 0) * this.behaviorWeights.loginFrequency;
    score += (factors.paymentRisk || 0) * this.behaviorWeights.paymentBehavior;
    score += (factors.bookingRisk || 0) * this.behaviorWeights.bookingPatterns;
    
    // Additional factors
    score += (factors.timeRisk || 0) * 0.1;
    score += (factors.velocityRisk || 0) * 0.1;

    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  // Determine risk level from score
  determineRiskLevel(score) {
    if (score >= this.riskThresholds.CRITICAL) return 'CRITICAL';
    if (score >= this.riskThresholds.HIGH) return 'HIGH';
    if (score >= this.riskThresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  // Log fraud analysis
  async logFraudAnalysis(userId, action, context, score, riskLevel, db) {
    await db.run(`
      INSERT INTO fraud_detections (
        user_id, action, context_data, risk_score, risk_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      action,
      JSON.stringify(context),
      score,
      riskLevel,
      new Date().toISOString()
    ]);
  }

  // Trigger alert for high-risk activities
  async triggerAlert(userId, action, context, score, riskLevel, db) {
    // Create alert record
    await db.run(`
      INSERT INTO fraud_alerts (
        user_id, action, risk_score, risk_level, status, created_at
      ) VALUES (?, ?, ?, ?, 'PENDING', ?)
    `, [userId, action, score, riskLevel, new Date().toISOString()]);

    // TODO: Implement real-time notifications to admin dashboard
    console.log(`FRAUD ALERT: User ${userId}, Action: ${action}, Risk: ${riskLevel} (${score})`);
  }

  // Utility methods
  generateFingerprint(userAgent, ip) {
    return crypto
      .createHash('sha256')
      .update(userAgent + ip)
      .digest('hex');
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export default FraudDetectionEngine;