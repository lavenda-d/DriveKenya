import React from 'react';

// Define the Car interface here since it's not exported from App
export interface Car {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  category?: string;
  price_per_day: number;
  location?: string;
  rating?: number;
  seats?: number | string;
  description?: string;
  specs?: {
    transmission?: string;
    fuelType?: string;
  };
  features?: string[];
  images?: Array<{ url: string }>;
  owner?: {
    name?: string;
    rating?: number;
    reviewCount?: number;
  };
  reviews?: Array<{
    userName?: string;
    rating: number;
    comment: string;
    date?: Date | string;
  }>;
  [key: string]: any;
}

interface CarDetailViewProps {
  car: Car;
  onBack: () => void;
}

const CarDetailView: React.FC<CarDetailViewProps> = ({ car, onBack }) => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
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

        <div className="bg-card backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
          {/* Main Image */}
          <div className="relative h-96 bg-gray-800">
            {car.images?.[0]?.url ? (
              <img
                src={car.images[0].url}
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
              <span className="ml-1">{car.rating?.toFixed(1) || '4.8'}</span>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column - Car Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {car.year} {car.make} {car.model}
                </h1>
                <p className="text-muted-foreground text-lg mb-6">
                  {car.location || 'Nairobi, Kenya'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-muted-foreground text-sm">Price per day</div>
                    <div className="text-2xl font-bold text-foreground">
                      KES {car.price_per_day?.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-muted-foreground text-sm">Transmission</div>
                    <div className="text-lg font-medium text-foreground">
                      {car.specs?.transmission || 'Automatic'}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-muted-foreground text-sm">Fuel Type</div>
                    <div className="text-lg font-medium text-foreground">
                      {car.specs?.fuelType || 'Petrol'}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-muted-foreground text-sm">Seats</div>
                    <div className="text-lg font-medium text-foreground">
                      {car.seats || '5'}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-foreground mb-4">About this car</h3>
                  <p className="text-muted-foreground">
                    {car.description || `This ${car.make} ${car.model} is a great choice for your next trip. Comfortable, reliable, and perfect for exploring Kenya's beautiful landscapes.`}
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Features</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const features = typeof car.features === 'string' ? JSON.parse(car.features || '[]') : (car.features || []);
                      return features.length > 0 ? features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="text-foreground/80">{feature}</span>
                        </div>
                      )) : (
                        <>
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-foreground/80">Air Conditioning</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-foreground/80">Bluetooth</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-foreground/80">GPS Navigation</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            <span className="text-foreground/80">USB Ports</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column - Booking Form */}
              <div className="w-full md:w-96">
                <div className="bg-muted/30 border border-border rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Book this car</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-muted-foreground text-sm mb-2">Pickup Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-muted-foreground text-sm mb-2">Return Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Price per day</span>
                        <span className="text-foreground">KES {car.price_per_day?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Number of days</span>
                        <span className="text-foreground">3 days</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold mt-4 pt-4 border-t border-border">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary">
                          KES {(car.price_per_day * 3)?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition-all mt-6"
                      onClick={() => {
                        // Handle booking logic here
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>

                <div className="mt-6 bg-muted/30 border border-border rounded-xl p-6">
                  <h4 className="font-semibold text-foreground mb-4">Owner Information</h4>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl mr-4">
                      {car.owner?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{car.owner?.name || 'Owner'}</p>
                      <p className="text-muted-foreground text-sm">
                        {car.owner?.rating ? `⭐ ${car.owner.rating} (${car.owner.reviewCount || 0} reviews)` : 'New owner'}
                      </p>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-secondary hover:bg-secondary/80 text-foreground py-2 rounded-lg font-medium transition-colors">
                    Contact Owner
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Images */}
            {car.images && car.images.length > 1 && (
              <div className="mt-12">
                <h3 className="text-xl font-semibold text-foreground mb-6">More Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {car.images?.slice(1).map((image: { url: string }, index: number) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
                      <img
                        src={image.url}
                        alt={`${car.make} ${car.model} ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-foreground mb-6">Reviews</h3>
              {car.reviews && car.reviews.length > 0 ? (
                <div className="space-y-6">
                  {car.reviews?.map((review: { userName?: string; rating: number; comment: string; date?: Date | string }, index: number) => (
                    <div key={index} className="bg-muted/30 p-6 rounded-xl border border-border">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mr-3">
                          {review.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{review.userName || 'Anonymous'}</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < (review.rating || 5) ? 'text-yellow-400' : 'text-muted-foreground'}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-foreground/80">{review.comment}</p>
                      <p className="text-muted-foreground text-sm mt-3">
                        {new Date(review.date || new Date()).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No reviews yet. Be the first to review this car!</p>
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
