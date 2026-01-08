import React, { useState, useEffect } from 'react';

// Define the Car interface here since it's not exported from App
export interface Car {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  category?: string;
  price_per_day?: number;
  price?: number;
  location?: string;
  rating?: number;
  seats?: number | string | null;
  description?: string;
  transmission?: string;
  fuel?: string;
  fuel_type?: string;
  vehicle_type?: string;
  color?: string;
  features?: string[] | string;
  image?: string;
  images?: Array<{ url: string }>;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  reviews?: number;
  review_count?: number;
  host_id?: number;
  [key: string]: any;
}

interface Review {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  rating_vehicle?: number;
  rating_cleanliness?: number;
  rating_communication?: number;
  rating_value?: number;
  photos?: Array<{ id: number; image_url: string }>;
}

interface CarDetailViewProps {
  car: Car;
  onBack: () => void;
  onProceedToBooking: () => void;
}

const CarDetailView: React.FC<CarDetailViewProps> = ({ car, onBack, onProceedToBooking }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSummary, setReviewSummary] = useState<{
    total: number;
    avg_rating: number;
  } | null>(null);

  // Fetch reviews for this car
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Fetch reviews
        const reviewsRes = await fetch(`${apiUrl}/api/reviews/car/${car.id}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.success) {
            setReviews(reviewsData.data.reviews || []);
          }
        }

        // Fetch review summary
        const summaryRes = await fetch(`${apiUrl}/api/reviews/car/${car.id}/summary`);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.success) {
            setReviewSummary(summaryData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setReviewsLoading(false);
      }
    };

    if (car.id) {
      fetchReviews();
    }
  }, [car.id]);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Get actual price - check both fields
  const actualPrice = car.price_per_day || car.price;
  
  // Get actual seats - only show if it exists and is valid
  const actualSeats = car.seats && car.seats !== 'null' && car.seats !== null ? car.seats : null;

  // Check if vehicle is motorized (should show fuel type)
  const isMotorized = !['bicycle', 'bike', 'cycle', 'scooter'].includes((car.vehicle_type || '').toLowerCase());
  
  // Check if vehicle needs transmission info
  const needsTransmission = !['bicycle', 'bike', 'cycle'].includes((car.vehicle_type || '').toLowerCase());
  
  // Parse features properly
  const getFeatures = () => {
    if (!car.features) return [];
    if (typeof car.features === 'string') {
      try {
        return JSON.parse(car.features);
      } catch {
        return [];
      }
    }
    return car.features;
  };

  const features = getFeatures();

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Vehicle Details</h1>
          <p className="text-muted-foreground text-lg">Complete information about this vehicle</p>
        </div>
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to results
          </button>

          <button
            onClick={onProceedToBooking}
            className="flex items-center bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Proceed with Booking
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>

        <div className="bg-card backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
          {/* Main Image */}
          <div className="relative h-96 bg-gray-800">
            {car.image ? (
              <img
                src={car.image}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-8xl">🚗</span>
              </div>
            )}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center">
              <span className="text-yellow-400">⭐</span>
              <span className="ml-1">{reviewSummary?.avg_rating?.toFixed(1) || car.rating?.toFixed(1) || 'New'}</span>
            </div>
            {/* Vehicle Type Badge */}
            <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium capitalize">
              {car.vehicle_type || car.category || 'Vehicle'}
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column - Car Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {car.year} {car.make} {car.model}
                </h2>
                <p className="text-muted-foreground text-lg mb-6 flex items-center">
                  <span className="mr-2">📍</span>
                  {car.location || 'Nairobi, Kenya'}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {/* Price - Always show */}
                  <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                    <div className="text-primary text-sm font-medium">Price per day</div>
                    <div className="text-2xl font-bold text-foreground">
                      {actualPrice ? `KES ${actualPrice.toLocaleString()}` : 'Contact Owner'}
                    </div>
                  </div>

                  {/* Vehicle Type - only if exists */}
                  {car.vehicle_type && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-muted-foreground text-sm">Vehicle Type</div>
                      <div className="text-lg font-medium text-foreground capitalize">
                        {car.vehicle_type}
                      </div>
                    </div>
                  )}

                  {/* Transmission - only for vehicles that need it */}
                  {needsTransmission && car.transmission && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-muted-foreground text-sm">Transmission</div>
                      <div className="text-lg font-medium text-foreground capitalize">
                        {car.transmission}
                      </div>
                    </div>
                  )}

                  {/* Fuel Type - only for motorized vehicles */}
                  {isMotorized && (car.fuel_type || car.fuel) && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-muted-foreground text-sm">Fuel Type</div>
                      <div className="text-lg font-medium text-foreground capitalize">
                        {car.fuel_type || car.fuel}
                      </div>
                    </div>
                  )}

                  {/* Seats - only if actually exists */}
                  {actualSeats && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-muted-foreground text-sm">Seats</div>
                      <div className="text-lg font-medium text-foreground">
                        {actualSeats}
                      </div>
                    </div>
                  )}

                  {/* Color - only if exists */}
                  {car.color && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-muted-foreground text-sm">Color</div>
                      <div className="text-lg font-medium text-foreground capitalize">
                        {car.color}
                      </div>
                    </div>
                  )}

                  {/* Year */}
                  {car.year && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-muted-foreground text-sm">Year</div>
                      <div className="text-lg font-medium text-foreground">
                        {car.year}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description - only show if exists */}
                {car.description && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">About this {car.vehicle_type || 'vehicle'}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {car.description}
                    </p>
                  </div>
                )}

                {/* Features - only show if there are actual features */}
                {features.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Features</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="text-foreground/80">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Owner Information */}
              <div className="w-full md:w-96">
                <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6 sticky top-24">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Owner Information</h3>
                  
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl mr-4">
                      {car.owner_name?.charAt(0)?.toUpperCase() || 'O'}
                    </div>
                    <div>
                      <p className="text-foreground font-semibold text-lg">
                        {car.owner_name || 'Vehicle Owner'}
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        📍 {car.location || 'Nairobi, Kenya'}
                      </p>
                    </div>
                  </div>

                  {/* Owner Contact Details */}
                  <div className="space-y-4 mb-6">
                    {car.owner_phone && (
                      <div className="flex items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-xl mr-3">📱</span>
                        <div>
                          <p className="text-muted-foreground text-xs">Phone Number</p>
                          <a href={`tel:${car.owner_phone}`} className="text-foreground font-medium hover:text-primary transition-colors">
                            {car.owner_phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {car.owner_email && (
                      <div className="flex items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-xl mr-3">✉️</span>
                        <div>
                          <p className="text-muted-foreground text-xs">Email Address</p>
                          <a href={`mailto:${car.owner_email}`} className="text-foreground font-medium hover:text-primary transition-colors break-all">
                            {car.owner_email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Buttons */}
                  <div className="space-y-3">
                    <button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                      onClick={() => {
                        if (car.owner_phone) {
                          window.location.href = `tel:${car.owner_phone}`;
                        } else {
                          alert('Owner phone number not available');
                        }
                      }}
                    >
                      <span className="mr-2">📞</span> Call Owner
                    </button>

                    <button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                      onClick={() => {
                        if (car.owner_email) {
                          window.location.href = `mailto:${car.owner_email}?subject=Inquiry about ${car.year} ${car.make} ${car.model}`;
                        } else {
                          alert('Owner email not available');
                        }
                      }}
                    >
                      <span className="mr-2">✉️</span> Email Owner
                    </button>

                    {car.owner_phone && (
                      <button 
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                        onClick={() => {
                          const message = encodeURIComponent(`Hello! I'm interested in renting your ${car.year} ${car.make} ${car.model}. Is it available?`);
                          window.open(`https://wa.me/${car.owner_phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                        }}
                      >
                        <span className="mr-2">💬</span> WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                  <h4 className="font-semibold text-foreground mb-4">Quick Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Reviews</span>
                      <span className="text-foreground font-semibold">{reviewSummary?.total || car.review_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Rating</span>
                      <span className="text-foreground font-semibold">
                        {reviewSummary?.avg_rating ? `⭐ ${reviewSummary.avg_rating.toFixed(1)}` : '⭐ New'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-12 border-t border-border pt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">
                  Reviews {reviewSummary?.total ? `(${reviewSummary.total})` : ''}
                </h3>
                <div className="flex items-center gap-4">
                  {reviewSummary?.avg_rating && (
                    <div className="flex items-center bg-yellow-500/10 px-4 py-2 rounded-full">
                      <span className="text-yellow-500 text-lg mr-2">⭐</span>
                      <span className="text-foreground font-bold text-lg">{reviewSummary.avg_rating.toFixed(1)}</span>
                      <span className="text-muted-foreground ml-2">/ 5</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors flex items-center"
                  >
                    <span className="mr-2">✍️</span>
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </div>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Share Your Experience</h4>
                  <div className="space-y-4">
                    {/* Star Rating */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Your Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                            className="text-3xl transition-transform hover:scale-110"
                          >
                            {star <= reviewForm.rating ? '⭐' : '☆'}
                          </button>
                        ))}
                        <span className="ml-2 text-muted-foreground self-center">({reviewForm.rating}/5)</span>
                      </div>
                    </div>
                    
                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Your Review</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Tell others about your experience with this vehicle..."
                        className="w-full bg-input/30 border border-border rounded-lg p-4 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                        rows={4}
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!reviewForm.comment.trim()) {
                            alert('Please write a review comment');
                            return;
                          }
                          setSubmittingReview(true);
                          try {
                            // Note: Full review submission requires a completed rental
                            // This is a demo showing the UI flow
                            alert('To submit a review, you need to have completed a rental of this vehicle. Reviews ensure authentic feedback from real customers.');
                            setShowReviewForm(false);
                          } catch (error) {
                            console.error('Error submitting review:', error);
                            alert('Failed to submit review');
                          } finally {
                            setSubmittingReview(false);
                          }
                        }}
                        disabled={submittingReview}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center"
                      >
                        {submittingReview ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <span className="mr-2">📤</span>
                            Submit Review
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Loading reviews...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-muted/30 p-6 rounded-xl border border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg mr-4">
                            {review.reviewer_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-foreground font-semibold">{review.reviewer_name || 'Anonymous'}</p>
                            <p className="text-muted-foreground text-sm">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center bg-yellow-500/10 px-3 py-1 rounded-full">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-foreground/80 leading-relaxed">{review.comment}</p>
                      )}

                      {/* Review Photos */}
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto">
                          {review.photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${photo.image_url}`}
                              alt="Review photo"
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}

                      {/* Detailed Ratings */}
                      {(review.rating_vehicle || review.rating_cleanliness || review.rating_communication || review.rating_value) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                          {review.rating_vehicle && (
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">Vehicle</p>
                              <p className="text-foreground font-medium">⭐ {review.rating_vehicle}</p>
                            </div>
                          )}
                          {review.rating_cleanliness && (
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">Cleanliness</p>
                              <p className="text-foreground font-medium">⭐ {review.rating_cleanliness}</p>
                            </div>
                          )}
                          {review.rating_communication && (
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">Communication</p>
                              <p className="text-foreground font-medium">⭐ {review.rating_communication}</p>
                            </div>
                          )}
                          {review.rating_value && (
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">Value</p>
                              <p className="text-foreground font-medium">⭐ {review.rating_value}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-border">
                  <span className="text-6xl mb-4 block">📝</span>
                  <p className="text-foreground font-medium text-lg">No reviews yet</p>
                  <p className="text-muted-foreground mt-2">Be the first to review this vehicle after your rental!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetailView;