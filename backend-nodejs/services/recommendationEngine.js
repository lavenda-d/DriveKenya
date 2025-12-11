const { Matrix } = await import('ml-matrix');

class RecommendationEngine {
  constructor() {
    this.userFeatures = [
      'age_group', 'preferred_category', 'avg_trip_duration', 
      'price_sensitivity', 'booking_frequency', 'location_preference'
    ];
    
    this.carFeatures = [
      'category', 'price_per_hour', 'fuel_efficiency', 'rating',
      'availability_score', 'demand_score', 'features_count'
    ];

    this.weights = {
      contentBased: 0.4,
      collaborative: 0.3,
      popularity: 0.2,
      location: 0.1
    };
  }

  // Main recommendation method
  async getRecommendations(userId, context = {}, db, limit = 10) {
    try {
      const userProfile = await this.getUserProfile(userId, db);
      const availableCars = await this.getAvailableCars(context, db);
      
      if (!availableCars.length) {
        return [];
      }

      // Generate different types of recommendations
      const contentBased = await this.getContentBasedRecommendations(userProfile, availableCars);
      const collaborative = await this.getCollaborativeRecommendations(userId, availableCars, db);
      const popularity = await this.getPopularityBasedRecommendations(availableCars, context);
      const location = await this.getLocationBasedRecommendations(userProfile, availableCars, context);

      // Combine recommendations with weighted scores
      const combined = this.combineRecommendations(
        contentBased, collaborative, popularity, location
      );

      // Apply business rules and filters
      const filtered = this.applyBusinessRules(combined, userProfile, context);

      // Sort by final score and return top recommendations
      return filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(rec => ({
          ...rec,
          reason: this.generateReason(rec, userProfile)
        }));

    } catch (error) {
      console.error('Recommendation generation error:', error);
      return [];
    }
  }

  // Get user profile and preferences
  async getUserProfile(userId, db) {
    const profile = await db.get(`
      SELECT 
        u.*,
        COUNT(DISTINCT b.id) as total_bookings,
        AVG(b.total_cost) as avg_spending,
        AVG(julianday(b.return_date) - julianday(b.pickup_date)) as avg_duration,
        GROUP_CONCAT(DISTINCT c.category) as preferred_categories,
        AVG(r.rating) as given_rating,
        AVG(cr.rating) as received_rating
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      LEFT JOIN cars c ON b.car_id = c.id
      LEFT JOIN reviews r ON u.id = r.user_id
      LEFT JOIN reviews cr ON b.id = cr.booking_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);

    // Get recent search patterns
    const searches = await db.all(`
      SELECT category, price_range, location, created_at
      FROM user_searches
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [userId]);

    // Calculate user preferences
    const preferences = this.calculateUserPreferences(profile, searches);

    return {
      ...profile,
      preferences,
      searches: searches.slice(0, 5) // Keep recent searches
    };
  }

  // Get available cars based on context
  async getAvailableCars(context, db) {
    const { pickup_date, return_date, location } = context;
    
    let query = `
      SELECT 
        c.*,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT b.id) as booking_count,
        CASE WHEN c.location = ? THEN 1 ELSE 0 END as location_match
      FROM cars c
      LEFT JOIN reviews r ON c.id = r.car_id
      LEFT JOIN bookings b ON c.id = b.car_id
      WHERE c.status = 'available'
    `;
    
    const params = [location || ''];

    // Add availability check if dates provided
    if (pickup_date && return_date) {
      query += `
        AND c.id NOT IN (
          SELECT car_id FROM bookings 
          WHERE status IN ('confirmed', 'active') 
          AND NOT (return_date < ? OR pickup_date > ?)
        )
      `;
      params.push(pickup_date, return_date);
    }

    query += ` GROUP BY c.id`;

    return await db.all(query, params);
  }

  // Content-based recommendations
  async getContentBasedRecommendations(userProfile, cars) {
    const userVector = this.createUserVector(userProfile);
    
    return cars.map(car => {
      const carVector = this.createCarVector(car);
      const similarity = this.calculateCosineSimilarity(userVector, carVector);
      
      return {
        car,
        score: similarity,
        type: 'content'
      };
    });
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, cars, db) {
    // Find similar users based on booking history
    const similarUsers = await this.findSimilarUsers(userId, db);
    
    if (!similarUsers.length) {
      return cars.map(car => ({ car, score: 0.5, type: 'collaborative' }));
    }

    // Get cars booked by similar users
    const similarUserBookings = await db.all(`
      SELECT car_id, COUNT(*) as booking_count, AVG(rating) as avg_rating
      FROM bookings b
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE b.user_id IN (${similarUsers.map(() => '?').join(',')})
      GROUP BY car_id
    `, similarUsers.map(u => u.user_id));

    return cars.map(car => {
      const booking = similarUserBookings.find(b => b.car_id === car.id);
      const score = booking ? 
        (booking.booking_count / 10) * (booking.avg_rating || 3) / 5 : 0.3;
      
      return {
        car,
        score: Math.min(score, 1),
        type: 'collaborative'
      };
    });
  }

  // Popularity-based recommendations
  async getPopularityBasedRecommendations(cars, context) {
    const maxBookings = Math.max(...cars.map(c => c.booking_count || 0));
    const maxRating = Math.max(...cars.map(c => c.rating || 0));
    
    return cars.map(car => {
      const popularityScore = (
        ((car.booking_count || 0) / Math.max(maxBookings, 1)) * 0.6 +
        ((car.rating || 0) / Math.max(maxRating, 1)) * 0.4
      );
      
      return {
        car,
        score: popularityScore,
        type: 'popularity'
      };
    });
  }

  // Location-based recommendations
  async getLocationBasedRecommendations(userProfile, cars, context) {
    const userLocation = context.location || userProfile.preferred_location;
    
    return cars.map(car => {
      // Simple location matching - in production, use proper distance calculation
      const locationScore = car.location_match || 
        (userLocation && car.location === userLocation) ? 1 : 0.5;
      
      return {
        car,
        score: locationScore,
        type: 'location'
      };
    });
  }

  // Combine different recommendation types
  combineRecommendations(contentBased, collaborative, popularity, location) {
    const carScores = {};

    // Initialize with content-based scores
    contentBased.forEach(rec => {
      carScores[rec.car.id] = {
        car: rec.car,
        score: rec.score * this.weights.contentBased,
        components: { content: rec.score }
      };
    });

    // Add collaborative scores
    collaborative.forEach(rec => {
      if (carScores[rec.car.id]) {
        carScores[rec.car.id].score += rec.score * this.weights.collaborative;
        carScores[rec.car.id].components.collaborative = rec.score;
      }
    });

    // Add popularity scores
    popularity.forEach(rec => {
      if (carScores[rec.car.id]) {
        carScores[rec.car.id].score += rec.score * this.weights.popularity;
        carScores[rec.car.id].components.popularity = rec.score;
      }
    });

    // Add location scores
    location.forEach(rec => {
      if (carScores[rec.car.id]) {
        carScores[rec.car.id].score += rec.score * this.weights.location;
        carScores[rec.car.id].components.location = rec.score;
      }
    });

    return Object.values(carScores);
  }

  // Apply business rules and filters
  applyBusinessRules(recommendations, userProfile, context) {
    return recommendations.filter(rec => {
      // Filter out cars user has recently booked (avoid repetition)
      // Add price range filtering
      // Add availability filtering
      // Add user preferences filtering
      
      return true; // Simplified for demo
    }).map(rec => {
      // Apply promotional boosts
      if (rec.car.has_promotion) {
        rec.score *= 1.1;
      }
      
      // Boost new cars
      const carAge = (Date.now() - new Date(rec.car.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (carAge < 30) { // New car (less than 30 days)
        rec.score *= 1.05;
      }
      
      return rec;
    });
  }

  // Generate explanation for recommendation
  generateReason(recommendation, userProfile) {
    const { components } = recommendation;
    const reasons = [];

    if (components.content > 0.7) {
      reasons.push("Matches your preferences");
    }
    
    if (components.collaborative > 0.6) {
      reasons.push("Popular with similar users");
    }
    
    if (components.popularity > 0.8) {
      reasons.push("Highly rated and frequently booked");
    }
    
    if (components.location > 0.9) {
      reasons.push("Near your preferred location");
    }

    if (recommendation.car.rating > 4.5) {
      reasons.push("Excellent customer reviews");
    }

    return reasons.length ? reasons[0] : "Recommended for you";
  }

  // Helper methods
  calculateUserPreferences(profile, searches) {
    const preferences = {
      categories: {},
      priceRange: { min: 0, max: 10000 },
      locations: {},
      features: {}
    };

    // Analyze search patterns
    searches.forEach(search => {
      if (search.category) {
        preferences.categories[search.category] = 
          (preferences.categories[search.category] || 0) + 1;
      }
      if (search.location) {
        preferences.locations[search.location] = 
          (preferences.locations[search.location] || 0) + 1;
      }
    });

    // Analyze booking history from profile
    if (profile.preferred_categories) {
      const categories = profile.preferred_categories.split(',');
      categories.forEach(cat => {
        preferences.categories[cat] = (preferences.categories[cat] || 0) + 2;
      });
    }

    return preferences;
  }

  createUserVector(userProfile) {
    // Create feature vector for user
    return [
      this.normalizeAge(userProfile.age),
      this.getCategoryScore(userProfile.preferences?.categories),
      this.normalizeDuration(userProfile.avg_duration),
      this.normalizePriceSensitivity(userProfile.avg_spending),
      this.normalizeFrequency(userProfile.total_bookings),
      this.getLocationScore(userProfile.preferences?.locations)
    ];
  }

  createCarVector(car) {
    // Create feature vector for car
    return [
      this.normalizeCategoryForCar(car.category),
      this.normalizePrice(car.price_per_hour),
      this.normalizeFuelEfficiency(car.fuel_efficiency),
      this.normalizeRating(car.rating),
      this.normalizeAvailability(car.availability_score),
      this.normalizeDemand(car.booking_count)
    ];
  }

  calculateCosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async findSimilarUsers(userId, db) {
    // Simple similarity based on booking patterns
    return await db.all(`
      SELECT DISTINCT b2.user_id, COUNT(*) as common_cars
      FROM bookings b1
      JOIN bookings b2 ON b1.car_id = b2.car_id
      WHERE b1.user_id = ? AND b2.user_id != ?
      GROUP BY b2.user_id
      HAVING common_cars >= 2
      ORDER BY common_cars DESC
      LIMIT 10
    `, [userId, userId]);
  }

  // Normalization helper methods
  normalizeAge(age) { return Math.min((age || 30) / 100, 1); }
  normalizeDuration(duration) { return Math.min((duration || 1) / 14, 1); }
  normalizePrice(price) { return Math.min((price || 50) / 200, 1); }
  normalizeRating(rating) { return (rating || 3) / 5; }
  normalizeFrequency(freq) { return Math.min((freq || 0) / 50, 1); }
  normalizeAvailability(score) { return (score || 50) / 100; }
  normalizeDemand(demand) { return Math.min((demand || 0) / 100, 1); }
  normalizeFuelEfficiency(efficiency) { return Math.min((efficiency || 10) / 30, 1); }
  normalizePriceSensitivity(spending) { return 1 - Math.min((spending || 100) / 1000, 1); }

  getCategoryScore(categories) {
    if (!categories) return 0.5;
    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    return total > 0 ? Math.min(total / 10, 1) : 0.5;
  }

  getLocationScore(locations) {
    if (!locations) return 0.5;
    const total = Object.values(locations).reduce((a, b) => a + b, 0);
    return total > 0 ? Math.min(total / 10, 1) : 0.5;
  }

  normalizeCategoryForCar(category) {
    const categoryMap = { 'economy': 0.2, 'compact': 0.4, 'standard': 0.6, 'luxury': 0.8, 'suv': 1.0 };
    return categoryMap[category?.toLowerCase()] || 0.5;
  }
}

export default RecommendationEngine;