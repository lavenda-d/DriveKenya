import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Heart, MapPin, Zap, TrendingUp, Users, Clock, DollarSign } from 'lucide-react';

const AIRecommendations = ({ userId, context = {} }) => {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [liked, setLiked] = useState(new Set());

  useEffect(() => {
    fetchRecommendations();
  }, [userId, filter]); // Removed context to prevent infinite loop

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: userId || localStorage.getItem('userId'),
          context,
          filter,
          limit: 12
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } else {
        // Use mock data if API fails
        setRecommendations(getMockRecommendations());
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      // Use mock data on error
      setRecommendations(getMockRecommendations());
    }
    setLoading(false);
  };

  const getMockRecommendations = () => {
    return [
      {
        car: {
          id: 1,
          name: 'Toyota Land Cruiser',
          category: 'SUV',
          price: 12000,
          image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400',
          images: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400'],
          rating: 4.8,
          location: 'Nairobi CBD'
        },
        score: 0.95,
        confidence: 0.95,
        reason: 'Based on your preferences for luxury SUVs'
      },
      {
        car: {
          id: 2,
          name: 'Mercedes-Benz E-Class',
          category: 'Luxury',
          price: 15000,
          image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400',
          images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400'],
          rating: 4.9,
          location: 'Westlands'
        },
        score: 0.92,
        confidence: 0.92,
        reason: 'Popular with similar users'
      },
      {
        car: {
          id: 3,
          name: 'Toyota Fortuner',
          category: 'SUV',
          price: 8000,
          image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400',
          images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400'],
          rating: 4.7,
          location: 'Karen'
        },
        score: 0.88,
        confidence: 0.88,
        reason: 'Highly rated in your location'
      },
      {
        car: {
          id: 4,
          name: 'Range Rover Sport',
          category: 'Luxury',
          price: 18000,
          image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400',
          images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400'],
          rating: 4.9,
          location: 'Kilimani'
        },
        score: 0.90,
        confidence: 0.90,
        reason: 'Trending in Nairobi'
      },
      {
        car: {
          id: 5,
          name: 'Toyota Prado',
          category: 'SUV',
          price: 10000,
          image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
          images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400'],
          rating: 4.6,
          location: 'Upperhill'
        },
        score: 0.85,
        confidence: 0.85,
        reason: 'Based on your recent searches'
      },
      {
        car: {
          id: 6,
          name: 'BMW X5',
          category: 'Luxury',
          price: 14000,
          image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400',
          images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400'],
          rating: 4.8,
          location: 'Lavington'
        },
        score: 0.87,
        confidence: 0.87,
        reason: 'Matches your budget preferences'
      }
    ];
  };

  const handleLike = async (carId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/recommendations/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          carId,
          feedback: 'like'
        })
      });

      setLiked(prev => new Set(prev).add(carId));
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  };

  const getReasonIcon = (reason) => {
    if (reason.includes('preferences')) return <Heart className="text-pink-500" size={16} />;
    if (reason.includes('similar users')) return <Users className="text-blue-500" size={16} />;
    if (reason.includes('rated')) return <Star className="text-yellow-500" size={16} />;
    if (reason.includes('location')) return <MapPin className="text-green-500" size={16} />;
    return <TrendingUp className="text-purple-500" size={16} />;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow animate-pulse">
            <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="text-blue-500" size={24} />
          <h2 className="text-2xl font-bold">{t('recommendations.title')}</h2>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('recommendations.all')}</option>
          <option value="popular">{t('recommendations.popular')}</option>
          <option value="nearby">{t('recommendations.nearby')}</option>
          <option value="similar">{t('recommendations.similar')}</option>
          <option value="topRated">{t('recommendations.topRated')}</option>
        </select>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
          <p className="text-gray-600">
            We're learning your preferences. Try browsing some cars to get personalized recommendations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.filter(rec => rec && rec.car).map((recommendation) => {
            const { car, score = 0.85, reason = 'Recommended for you' } = recommendation;
            if (!car || !car.id) return null;

            const isLiked = liked.has(car.id);

            return (
              <div key={car.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={car.images?.[0] || '/placeholder-car.jpg'}
                    alt={car.name}
                    className="w-full h-48 object-cover"
                  />

                  {/* Recommendation Score Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {Math.round(score * 100)}% Match
                    </div>
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(car.id)}
                    className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${isLiked
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-gray-400 hover:text-pink-500'
                      }`}
                  >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                  </button>

                  {/* Promotion Badge */}
                  {car.has_promotion && (
                    <div className="absolute bottom-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs">
                      Special Offer
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{car.name}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="text-yellow-400" size={16} fill="currentColor" />
                      <span className="text-sm text-gray-600">
                        {car.rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                    <MapPin size={14} />
                    <span>{car.location}</span>
                    <span>•</span>
                    <span>{car.category}</span>
                  </div>

                  {/* Recommendation Reason */}
                  <div className="flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-lg">
                    {getReasonIcon(reason)}
                    <span className="text-xs text-gray-700">{reason}</span>
                  </div>

                  {/* Car Features */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {car.features?.slice(0, 3).map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <DollarSign size={16} className="text-green-500" />
                      <span className="text-lg font-semibold text-green-600">
                        {car.price_per_hour}
                      </span>
                      <span className="text-sm text-gray-500">/hour</span>
                    </div>

                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 text-sm">
                        {t('cars.details')}
                      </button>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                        {t('cars.book')}
                      </button>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock size={12} />
                      <span>Available now</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users size={12} />
                      <span>{car.review_count || 0} reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Learning Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Zap className="text-blue-500" size={20} />
          <div>
            <h4 className="font-medium text-blue-900">AI Learning in Progress</h4>
            <p className="text-sm text-blue-700">
              Our AI is learning your preferences to provide better recommendations.
              Like cars you're interested in to improve suggestions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;